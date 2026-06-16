/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocFromServer,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
// 1. Initialize Firebase Core with Environment Variable support and JSON fallback
import { LeaderboardEntry } from "../types";

// Safely load local config via import.meta.glob to prevent compile errors when ignored on GitHub
const configModules = (import.meta as any).glob("../../firebase-applet-config.json", { eager: true }) || {};
const configPaths = Object.keys(configModules);
const configModule: any = configPaths.length > 0 ? configModules[configPaths[0]] : null;
const firebaseConfig: any = configModule ? (configModule.default || configModule) : {};

const metaEnv = (import.meta as any).env || {};
const resolvedConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId || "",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId || "",
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || "",
};

const app = initializeApp(resolvedConfig);
export const db = getFirestore(app, resolvedConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);

// 2. Setup Google Auth Provider with Google Sheets Scope
export const sheetsProvider = new GoogleAuthProvider();
sheetsProvider.addScope("https://www.googleapis.com/auth/spreadsheets");

// Caching access token in memory - NEVER store in localStorage (security constraint)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// 3. Error Handling - Mandatory conformant JSON shape
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 4. Validate connection on start as required by skills
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Firestore client appears offline. Please check network/config.");
    }
  }
}

// Run test connection silently
testConnection();

// 5. Auth Listener and Operations
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignInForSheets = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, sheetsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get Google Sheets OAuth access token.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Link account error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// 6. Realtime Firestore Leaderboard Accessors
export const listenToLeaderboard = (
  callback: (entries: LeaderboardEntry[]) => void,
  errorCallback?: (error: Error) => void
) => {
  const collectionName = "leaderboard";
  const scoresQuery = query(collection(db, collectionName), orderBy("score", "desc"));

  return onSnapshot(
    scoresQuery,
    (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as LeaderboardEntry);
      });
      callback(entries);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      if (errorCallback) errorCallback(error as Error);
    }
  );
};

export const submitLeaderboardScore = async (entry: LeaderboardEntry) => {
  const collectionName = "leaderboard";
  try {
    const docRef = doc(db, collectionName, entry.id);
    await setDoc(docRef, entry);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${collectionName}/${entry.id}`);
  }
};

export const deleteLeaderboardEntry = async (entryId: string) => {
  const collectionName = "leaderboard";
  try {
    const docRef = doc(db, collectionName, entryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${entryId}`);
  }
};

// 7. Google Workspace Sheet Export Function
export const exportToGoogleSheet = async (
  entries: LeaderboardEntry[],
  accessToken: string
): Promise<string> => {
  // Sort identical to leaderboard specs
  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.timestamp - b.timestamp;
  });

  // Create a beautiful sheet
  const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: `微光元素精靈的奇幻旅程 - 全宇宙排行榜歷程 (${new Date().toLocaleDateString()})`,
      },
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Google Sheets 建立失敗: ${errText}`);
  }

  const sheetData = await createResponse.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadSheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Format headers and records
  const headers = [
    "排名",
    "戰隊小隊名稱",
    "無限關高分數 (PTS)",
    "出戰元素精靈",
    "奔跑時間 (秒)",
    "星等評價",
    "達成日期",
    "唯一紀錄ID"
  ];

  const rows = sorted.map((entry, idx) => [
    idx + 1,
    entry.player_name,
    entry.score,
    `${entry.pikmin_type}系`,
    entry.play_time,
    "★".repeat(entry.star_rating),
    entry.date,
    entry.id,
  ]);

  const valuesPayload = [headers, ...rows];

  // Append values to range "Sheet1!A1"
  const appendResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: valuesPayload,
      }),
    }
  );

  if (!appendResponse.ok) {
    const errText = await appendResponse.text();
    throw new Error(`寫入 Google Sheets 資料失敗: ${errText}`);
  }

  return spreadSheetUrl;
};
