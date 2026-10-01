import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { BookmarkItem, ReadingProgress } from './types';

/** Data yang disimpan di Firestore: users/{uid} */
export interface CloudUserData {
  history: ReadingProgress[];
  bookmarks: BookmarkItem[];
  readingSeconds: number;
  level: number;
  exp: number;
  customUsername?: string;
  updatedAt?: string;
}

export async function loadCloudData(uid: string): Promise<CloudUserData | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data() as Partial<CloudUserData>;
  return {
    history: Array.isArray(d.history) ? d.history : [],
    bookmarks: Array.isArray(d.bookmarks) ? d.bookmarks : [],
    readingSeconds: Number(d.readingSeconds) || 0,
    level: Number(d.level) || 1,
    exp: Number(d.exp) || 0,
    customUsername: d.customUsername || undefined,
    updatedAt: d.updatedAt,
  };
}

export async function saveCloudData(uid: string, data: CloudUserData): Promise<void> {
  // Firestore menolak nilai `undefined`, jadi dibersihkan lewat JSON
  const clean = JSON.parse(
    JSON.stringify({ ...data, updatedAt: new Date().toISOString() })
  );
  await setDoc(doc(getFirebaseDb(), 'users', uid), clean, { merge: true });
}
