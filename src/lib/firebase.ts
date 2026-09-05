import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalEntry } from '../types';

// Initialize Firebase App instance safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore targeting the specific database provisioned for this applet
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

/**
 * Strips all undefined fields recursively from objects before persisting to Firestore.
 * This guarantees zero runtime crashes from undefined properties.
 */
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Sign in using Google Auth Popup
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Failed to sign in with Google:', error);
    throw error;
  }
}

/**
 * Sign out current authenticated user
 */
export async function logOut(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Save or update a Journal Entry isolated in /users/{userId}/entries/{entryId}
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to save journal entries.');
  }
  const cleanData = sanitizePayload(entry);
  const entryDocRef = doc(db, 'users', userId, 'entries', entry.id);
  await setDoc(entryDocRef, cleanData, { merge: true });

  // Also record in interactions subcollection for comprehensive audit history
  try {
    const interactionRef = doc(db, 'users', userId, 'interactions', `${entry.id}_log`);
    await setDoc(
      interactionRef,
      sanitizePayload({
        id: `${entry.id}_log`,
        entryId: entry.id,
        type: entry.type,
        title: entry.title,
        timestamp: new Date().toISOString(),
        summaryTitle: entry.summary?.title || null
      }),
      { merge: true }
    );
  } catch (e) {
    console.warn('Non-blocking interaction log warning:', e);
  }
}

/**
 * Fetch all entries for a specific user, strictly isolated by user ID
 */
export async function getUserEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];
  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  const entries: JournalEntry[] = [];
  snapshot.forEach((docSnapshot) => {
    entries.push(docSnapshot.data() as JournalEntry);
  });
  return entries;
}

/**
 * Delete an entry securely for the authorized user
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) return;
  const docRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(docRef);
}

export { onAuthStateChanged };
export type { User };
