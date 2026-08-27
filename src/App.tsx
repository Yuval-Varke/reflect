/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./components/Header";
import { ReflectionEditor } from "./components/ReflectionEditor";
import { CoachReplyCard } from "./components/CoachReplyCard";
import { JournalHistory } from "./components/JournalHistory";
import { InsightsView } from "./components/InsightsView";
import { ExportImportModal } from "./components/ExportImportModal";
import { CloudSyncModal } from "./components/CloudSyncModal";
import { JournalEntry, ChatMessage, ReflectionResponse } from "./types";
import {
  loadJournalEntries,
  saveJournalEntries,
  saveOrUpdateEntry,
  deleteJournalEntry,
  saveDraft,
  loadDraft,
  clearDraft,
  calculateJournalStreak,
} from "./utils/storage";
import { requestReflection } from "./services/api";
import { auth, tryEnsureAuthenticatedUser } from "./services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  subscribeToUserEntries,
  saveEntryToFirestore,
  deleteEntryFromFirestore,
  syncLocalEntriesToFirestore,
} from "./services/firestoreSync";
import { Sparkles, ArrowLeft, HeartHandshake, CloudOff, AlertCircle } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"studio" | "history" | "insights">("studio");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [currentText, setCurrentText] = useState<string>("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExportImportOpen, setIsExportImportOpen] = useState<boolean>(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const hasMigratedLocal = useRef(false);

  // 1. Initialize local cache and draft
  useEffect(() => {
    const loaded = loadJournalEntries();
    if (loaded.length > 0) {
      setJournalEntries(loaded);
    }

    const draft = loadDraft();
    if (draft && draft.text) {
      setCurrentText(draft.text);
      if (draft.mood) setSelectedMood(draft.mood);
    }
  }, []);

  // 2. Initialize Firebase Auth and ensure user exists
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsCloudConnected(true);

        // One-time local cache migration to Firestore if needed
        if (!hasMigratedLocal.current) {
          hasMigratedLocal.current = true;
          const local = loadJournalEntries();
          if (local.length > 0) {
            await syncLocalEntriesToFirestore(user.uid, local);
          }
        }

        // Subscribe to real-time updates from Firestore
        if (unsubscribeFirestore) unsubscribeFirestore();
        unsubscribeFirestore = subscribeToUserEntries(
          user.uid,
          (cloudEntries) => {
            setJournalEntries(cloudEntries);
            saveJournalEntries(cloudEntries);
            setIsCloudConnected(true);
          },
          (err) => {
            console.warn("Firestore sync warning:", err);
            // Still retain local entries
          }
        );
      } else {
        // Attempt anonymous sign-in if enabled on project; otherwise run in guest mode
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
        setCurrentUser(null);
        setIsCloudConnected(false);

        tryEnsureAuthenticatedUser().then((anonUser) => {
          if (anonUser) {
            setCurrentUser(anonUser);
            setIsCloudConnected(true);
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Manual trigger to re-sync local cache with cloud
  const handleManualSync = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const local = loadJournalEntries();
      await syncLocalEntriesToFirestore(currentUser.uid, local);
    } catch (err) {
      console.error("Manual sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save drafts continuously
  const handleTextChange = (text: string) => {
    setCurrentText(text);
    saveDraft(text, selectedMood);
  };

  const handleMoodChange = (mood: string) => {
    setSelectedMood(mood);
    saveDraft(currentText, mood);
  };

  const streak = calculateJournalStreak(journalEntries);

  // Submit initial journal reflection to coach
  const handleSubmitReflection = async () => {
    if (!currentText.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response: ReflectionResponse = await requestReflection({
        text: currentText,
        moodContext: selectedMood,
      });

      const newEntry: JournalEntry = {
        id: `entry-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userPrompt: currentText,
        reflectionReply: response.reflectionReply,
        metadata: response.metadata,
        thread: [],
        bookmarked: false,
      };

      // Optimistic local update
      const updated = saveOrUpdateEntry(newEntry);
      setJournalEntries(updated);
      setActiveEntry(newEntry);
      clearDraft();
      setCurrentText("");
      setSelectedMood("");

      // Persist to Firestore
      if (currentUser?.uid) {
        saveEntryToFirestore(currentUser.uid, newEntry).catch((err) => {
          console.error("Failed to persist to Firestore:", err);
        });
      }
    } catch (err: any) {
      console.error("Reflection Generation Error:", err);
      setErrorMessage(err?.message || "Failed to generate reflection. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit follow-up message in active coaching thread
  const handleFollowUpSubmit = async (messageText: string) => {
    if (!activeEntry || !messageText.trim() || isSubmittingFollowUp) return;

    setIsSubmittingFollowUp(true);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };

    const updatedThreadWithUser = [...(activeEntry.thread || []), userMessage];

    // Optimistically update entry
    const tempEntry: JournalEntry = {
      ...activeEntry,
      thread: updatedThreadWithUser,
      updatedAt: Date.now(),
    };
    setActiveEntry(tempEntry);

    try {
      const response: ReflectionResponse = await requestReflection({
        text: messageText,
        thread: [
          {
            id: `init-user`,
            role: "user",
            content: activeEntry.userPrompt,
            timestamp: activeEntry.createdAt,
          },
          {
            id: `init-coach`,
            role: "assistant",
            content: activeEntry.reflectionReply,
            timestamp: activeEntry.createdAt + 1000,
          },
          ...updatedThreadWithUser,
        ],
        moodContext: activeEntry.metadata.dominantMood,
      });

      const coachMessage: ChatMessage = {
        id: `msg-coach-${Date.now()}`,
        role: "assistant",
        content: response.reflectionReply,
        timestamp: Date.now(),
        metadata: response.metadata,
      };

      const finalEntry: JournalEntry = {
        ...tempEntry,
        metadata: {
          ...tempEntry.metadata,
          briefSummary: response.metadata?.briefSummary || tempEntry.metadata.briefSummary,
          tags: Array.from(new Set([...(tempEntry.metadata.tags || []), ...(response.metadata?.tags || [])])),
        },
        thread: [...updatedThreadWithUser, coachMessage],
        updatedAt: Date.now(),
      };

      // Optimistic local update
      const updatedList = saveOrUpdateEntry(finalEntry);
      setJournalEntries(updatedList);
      setActiveEntry(finalEntry);

      // Persist to Firestore
      if (currentUser?.uid) {
        saveEntryToFirestore(currentUser.uid, finalEntry).catch((err) => {
          console.error("Failed to save follow-up to Firestore:", err);
        });
      }
    } catch (err: any) {
      console.error("Follow-up error:", err);
      alert(`Could not process follow-up: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const handleToggleBookmark = (id: string) => {
    const entry = journalEntries.find((e) => e.id === id);
    if (!entry) return;

    const updatedEntry = { ...entry, bookmarked: !entry.bookmarked };
    const updatedList = saveOrUpdateEntry(updatedEntry);
    setJournalEntries(updatedList);
    if (activeEntry && activeEntry.id === id) {
      setActiveEntry(updatedEntry);
    }

    if (currentUser?.uid) {
      saveEntryToFirestore(currentUser.uid, updatedEntry).catch((err) => {
        console.error("Failed to update bookmark in Firestore:", err);
      });
    }
  };

  const handleDeleteEntry = (id: string) => {
    const updated = deleteJournalEntry(id);
    setJournalEntries(updated);
    if (activeEntry && activeEntry.id === id) {
      setActiveEntry(null);
    }

    if (currentUser?.uid) {
      deleteEntryFromFirestore(currentUser.uid, id).catch((err) => {
        console.error("Failed to delete from Firestore:", err);
      });
    }
  };

  const handleSelectEntryFromHistory = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setActiveTab("studio");
  };

  const handleStartNewReflection = () => {
    setActiveEntry(null);
    setActiveTab("studio");
  };

  const handleImportSuccess = async (imported: JournalEntry[]) => {
    setJournalEntries(imported);
    saveJournalEntries(imported);
    if (currentUser?.uid) {
      await syncLocalEntriesToFirestore(currentUser.uid, imported);
    }
  };

  // Quick Seed Demo Sample
  const handleLoadSampleReflection = () => {
    const sampleEntry: JournalEntry = {
      id: `sample-${Date.now()}`,
      createdAt: Date.now() - 3600000 * 2,
      updatedAt: Date.now() - 3600000 * 2,
      userPrompt:
        "I've been feeling torn about taking on a major leadership project at work. On one hand, it's a huge career opportunity I've wanted for years. On the other hand, my energy has already been drained from recent personal transitions, and I'm terrified that saying yes will push me into chronic burnout.",
      reflectionReply:
        "It makes complete sense that you're feeling this tension. You are standing at the intersection of a meaningful ambition and an authentic awareness of your current capacity.\n\n### Core Themes Observed:\n- **Ambition vs. Self-Preservation**: A conflict between future professional identity and present physiological well-being.\n- **The All-or-Nothing Assumption**: The implicit belief that you must either accept the full burden as presented or forfeit your growth.\n\n### Introspection & Actionable Thought Exercise:\n1. **What would a third option look like?** Is there a way to accept the leadership scope while explicitly delegating or adjusting other baseline responsibilities?\n2. **If you paused fear for a moment**, what is your body telling you about your baseline energy needs over the next 90 days?",
      metadata: {
        sessionTitle: "Career Ambition vs Capacity Boundaries",
        dominantMood: "Restless",
        tags: ["Leadership", "Boundaries", "Burnout", "Decisions"],
        briefSummary:
          "Balancing a coveted leadership opportunity against current personal energy reserves and fear of burnout.",
      },
      thread: [
        {
          id: "sample-msg-1",
          role: "user",
          content:
            "When I think about the third option, I realize I could ask for a co-lead or renegotiate our sprint delivery timeline before formally saying yes.",
          timestamp: Date.now() - 3600000 * 1.5,
        },
        {
          id: "sample-msg-2",
          role: "assistant",
          content:
            "That is a powerful realization. Advocating for co-leadership or timeline adjustments transforms this from a passive test of endurance into an active demonstration of mature leadership.",
          timestamp: Date.now() - 3600000 * 1.4,
        },
      ],
      bookmarked: true,
    };

    const updated = saveOrUpdateEntry(sampleEntry);
    setJournalEntries(updated);
    setActiveEntry(sampleEntry);
    setActiveTab("studio");

    if (currentUser?.uid) {
      saveEntryToFirestore(currentUser.uid, sampleEntry).catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-black text-black dark:text-white flex flex-col font-sans antialiased selection:bg-neutral-300 dark:selection:bg-neutral-700 selection:text-black dark:selection:text-white">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        streak={streak}
        totalEntries={journalEntries.length}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onNewReflection={handleStartNewReflection}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        isCloudConnected={isCloudConnected}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Studio View */}
        {activeTab === "studio" && (
          <>
            {activeEntry ? (
              <div className="space-y-4">
                {/* Back to write button */}
                <div className="flex items-center justify-between">
                  <button
                    id="back-to-editor-btn"
                    type="button"
                    onClick={handleStartNewReflection}
                    className="flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-lg bg-black border border-black transition-none cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Start New Journal Reflection</span>
                  </button>

                  <span className="text-xs text-neutral-400">
                    Saved to Firestore & History
                  </span>
                </div>

                {/* Display Coach Feedback Card */}
                <CoachReplyCard
                  entry={activeEntry}
                  onFollowUpSubmit={handleFollowUpSubmit}
                  isSubmittingFollowUp={isSubmittingFollowUp}
                  onToggleBookmark={handleToggleBookmark}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Editor Component */}
                <ReflectionEditor
                  initialText={currentText}
                  onTextChange={handleTextChange}
                  selectedMood={selectedMood}
                  onMoodChange={handleMoodChange}
                  onSubmit={handleSubmitReflection}
                  isLoading={isLoading}
                  errorMessage={errorMessage}
                  onRetry={handleSubmitReflection}
                />

                {/* Quick sample demo banner if no reflections exist */}
                {journalEntries.length === 0 && (
                  <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300">
                      <HeartHandshake className="w-4 h-4 text-black dark:text-white shrink-0" />
                      <span>Want to explore how the reflection coach responds before typing?</span>
                    </div>
                    <button
                      id="load-sample-btn"
                      type="button"
                      onClick={handleLoadSampleReflection}
                      className="px-3 py-1.5 bg-black text-white border border-black rounded-lg font-medium shrink-0 transition-none flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-white" />
                      <span className="text-white">Load Interactive Sample</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* History View */}
        {activeTab === "history" && (
          <JournalHistory
            entries={journalEntries}
            onSelectEntry={handleSelectEntryFromHistory}
            onDeleteEntry={handleDeleteEntry}
            onToggleBookmark={handleToggleBookmark}
            onStartNew={handleStartNewReflection}
          />
        )}

        {/* Insights View */}
        {activeTab === "insights" && (
          <InsightsView
            entries={journalEntries}
            onStartNew={handleStartNewReflection}
          />
        )}
      </main>

      {/* Export / Import Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        entries={journalEntries}
        onImportSuccess={handleImportSuccess}
      />

      {/* Cloud Firestore Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        user={currentUser}
        totalSynced={journalEntries.length}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
      />
    </div>
  );
}
