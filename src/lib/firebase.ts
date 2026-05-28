import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, terminate,
  type Firestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAGFdbWod_EJgh4OC056IvcqT621L9FWUo",
  authDomain: "jira-39437.firebaseapp.com",
  projectId: "jira-39437",
  storageBucket: "jira-39437.firebasestorage.app",
  messagingSenderId: "856760821072",
  appId: "1:856760821072:web:67c7e4d367776148aff855",
  measurementId: "G-QL5TS4ZKW7"
};

// Initialize Firebase App (lightweight — no network connections)
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics (client-only, non-blocking)
let analytics = null;
if (typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics, isSupported }) => {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  });
}

// ===== LAZY Firestore initialization =====
let _db: Firestore | null = null;
let firestoreDisabled = false;

function getDb(): Firestore | null {
  if (firestoreDisabled) return null;
  if (!_db) {
    _db = getFirestore(app);
  }
  return _db;
}

async function disableFirestore(reason: string) {
  firestoreDisabled = true;
  console.warn(`[Firebase] ⚠ Firestore disabled: ${reason}`);

  // Terminate the gRPC connection to stop internal retry spam
  if (_db) {
    try {
      await terminate(_db);
    } catch {
      // ignore
    }
    _db = null;
  }
}

function isFirestoreError(error: any): boolean {
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    msg.includes('permission_denied') ||
    msg.includes('not been used in project') ||
    msg.includes('is disabled') ||
    msg.includes('not_found') ||
    msg.includes('code: 5') ||
    msg.includes('code: 7')
  );
}

// Helpers to store and load metrics from Firestore
export async function saveMetricsToFirestore(type: 'support' | 'dev', data: any) {
  const db = getDb();
  if (!db) return;

  try {
    const cleanedData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, "metrics", type), {
      ...cleanedData,
      syncedAt: new Date().toISOString()
    });
    console.log(`[Firebase] ✓ Saved ${type} metrics.`);
  } catch (error: any) {
    if (isFirestoreError(error)) {
      await disableFirestore(`Write failed — ${error?.message?.slice(0, 120) || 'unknown error'}`);
    } else {
      console.error(`[Firebase] Write error:`, error?.message || error);
    }
  }
}

export async function getMetricsFromFirestore(type: 'support' | 'dev') {
  const db = getDb();
  if (!db) return null;

  try {
    const snap = await getDoc(doc(db, "metrics", type));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error: any) {
    if (isFirestoreError(error)) {
      await disableFirestore(`Read failed — ${error?.message?.slice(0, 120) || 'unknown error'}`);
    } else {
      console.error(`[Firebase] Read error:`, error?.message || error);
    }
  }
  return null;
}

export { app, analytics };
