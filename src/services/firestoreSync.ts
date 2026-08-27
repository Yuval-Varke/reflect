import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { JournalEntry } from "../types";

/**
 * Sanitizes any data payload to strictly remove undefined properties
 * before sending to Firestore SDK to prevent exceptions.
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Real-time listener for user's journal entries from Firestore.
 */
export function subscribeToUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const entriesRef = collection(db, "users", userId, "entries");
  const q = query(entriesRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        entries.push({
          id: docSnap.id,
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
          userPrompt: data.userPrompt || "",
          reflectionReply: data.reflectionReply || "",
          metadata: {
            sessionTitle: data.metadata?.sessionTitle || "Reflection Session",
            dominantMood: data.metadata?.dominantMood || "Reflective",
            tags: Array.isArray(data.metadata?.tags) ? data.metadata.tags : [],
            briefSummary: data.metadata?.briefSummary || "",
          },
          thread: Array.isArray(data.thread) ? data.thread : [],
          bookmarked: Boolean(data.bookmarked),
        });
      });
      onUpdate(entries);
    },
    (err) => {
      console.error("Firestore subscription error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Persists a single JournalEntry document in Firestore under /users/{userId}/entries/{entryId}.
 */
export async function saveEntryToFirestore(
  userId: string,
  entry: JournalEntry
): Promise<void> {
  if (!userId || !entry.id) {
    throw new Error("Cannot save entry to Firestore: Missing userId or entry.id");
  }

  const entryRef = doc(db, "users", userId, "entries", entry.id);
  const payload = sanitizeForFirestore({
    id: entry.id,
    userId: userId,
    createdAt: entry.createdAt || Date.now(),
    updatedAt: Date.now(),
    userPrompt: entry.userPrompt || "",
    reflectionReply: entry.reflectionReply || "",
    metadata: {
      sessionTitle: entry.metadata?.sessionTitle || "Reflection Session",
      dominantMood: entry.metadata?.dominantMood || "Reflective",
      tags: Array.isArray(entry.metadata?.tags) ? entry.metadata.tags : [],
      briefSummary: entry.metadata?.briefSummary || "",
    },
    thread: Array.isArray(entry.thread) ? entry.thread : [],
    bookmarked: Boolean(entry.bookmarked),
  });

  await setDoc(entryRef, payload, { merge: true });
}

/**
 * Deletes a JournalEntry document from Firestore.
 */
export async function deleteEntryFromFirestore(
  userId: string,
  entryId: string
): Promise<void> {
  if (!userId || !entryId) return;
  const entryRef = doc(db, "users", userId, "entries", entryId);
  await deleteDoc(entryRef);
}

/**
 * Syncs any local offline entries to Firestore if they do not yet exist in Firestore.
 */
export async function syncLocalEntriesToFirestore(
  userId: string,
  localEntries: JournalEntry[]
): Promise<void> {
  if (!userId || !localEntries || localEntries.length === 0) return;

  try {
    const entriesRef = collection(db, "users", userId, "entries");
    const existingSnap = await getDocs(entriesRef);
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));

    const batch = writeBatch(db);
    let count = 0;

    for (const entry of localEntries) {
      if (!existingIds.has(entry.id)) {
        const ref = doc(db, "users", userId, "entries", entry.id);
        const payload = sanitizeForFirestore({
          id: entry.id,
          userId: userId,
          createdAt: entry.createdAt || Date.now(),
          updatedAt: entry.updatedAt || Date.now(),
          userPrompt: entry.userPrompt || "",
          reflectionReply: entry.reflectionReply || "",
          metadata: {
            sessionTitle: entry.metadata?.sessionTitle || "Reflection Session",
            dominantMood: entry.metadata?.dominantMood || "Reflective",
            tags: Array.isArray(entry.metadata?.tags) ? entry.metadata.tags : [],
            briefSummary: entry.metadata?.briefSummary || "",
          },
          thread: Array.isArray(entry.thread) ? entry.thread : [],
          bookmarked: Boolean(entry.bookmarked),
        });
        batch.set(ref, payload);
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Migrated ${count} local entries to Cloud Firestore.`);
    }
  } catch (err) {
    console.warn("Could not sync local entries to Firestore:", err);
  }
}
