import { JournalEntry, MoodStat } from "../types";

const STORAGE_KEY = "reflect_journal_entries_v1";
const DRAFT_KEY = "reflect_journal_current_draft_v1";

// Defensive undefined-stripping utility
export function sanitizeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export function loadJournalEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  } catch (err) {
    console.error("Failed to load journal entries from storage:", err);
    return [];
  }
}

export function saveJournalEntries(entries: JournalEntry[]): boolean {
  try {
    const sanitized = sanitizeData(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch (err) {
    console.error("Failed to save journal entries to storage:", err);
    return false;
  }
}

export function saveOrUpdateEntry(entry: JournalEntry): JournalEntry[] {
  const existing = loadJournalEntries();
  const index = existing.findIndex((e) => e.id === entry.id);
  let updated: JournalEntry[];

  if (index >= 0) {
    updated = [...existing];
    updated[index] = { ...entry, updatedAt: Date.now() };
  } else {
    updated = [entry, ...existing];
  }

  saveJournalEntries(updated);
  return updated;
}

export function deleteJournalEntry(id: string): JournalEntry[] {
  const existing = loadJournalEntries();
  const updated = existing.filter((e) => e.id !== id);
  saveJournalEntries(updated);
  return updated;
}

export function saveDraft(text: string, mood?: string): void {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ text, mood, timestamp: Date.now() })
    );
  } catch (e) {
    console.warn("Could not save draft:", e);
  }
}

export function loadDraft(): { text: string; mood: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function getLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateJournalStreak(entries: JournalEntry[]): number {
  if (!entries || entries.length === 0) return 0;

  const dateKeys = Array.from(
    new Set(entries.map((e) => getLocalDateKey(e.createdAt)))
  ).sort().reverse();

  if (dateKeys.length === 0) return 0;

  const todayKey = getLocalDateKey(Date.now());
  const yesterdayKey = getLocalDateKey(Date.now() - 86400000);

  // If latest entry is neither today nor yesterday, streak is broken
  if (dateKeys[0] !== todayKey && dateKeys[0] !== yesterdayKey) {
    return 0;
  }

  let streak = 1;
  for (let i = 0; i < dateKeys.length - 1; i++) {
    const curr = new Date(dateKeys[i]).getTime();
    const prev = new Date(dateKeys[i + 1]).getTime();
    const diffDays = Math.round((curr - prev) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export interface DayActivity {
  dateKey: string;
  dayName: string;
  dayNumber: number;
  count: number;
  isToday: boolean;
  hasEntry: boolean;
}

export function getActivityHeatmapData(entries: JournalEntry[], daysCount = 14): DayActivity[] {
  const activityMap: Record<string, number> = {};
  entries.forEach((e) => {
    const key = getLocalDateKey(e.createdAt);
    activityMap[key] = (activityMap[key] || 0) + 1;
  });

  const todayKey = getLocalDateKey(Date.now());
  const result: DayActivity[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const time = Date.now() - i * 86400000;
    const d = new Date(time);
    const key = getLocalDateKey(time);
    const dayName = d.toLocaleDateString([], { weekday: "narrow" });
    const dayNumber = d.getDate();

    result.push({
      dateKey: key,
      dayName,
      dayNumber,
      count: activityMap[key] || 0,
      isToday: key === todayKey,
      hasEntry: (activityMap[key] || 0) > 0,
    });
  }

  return result;
}

export function computeMoodStats(entries: JournalEntry[]): MoodStat[] {
  if (!entries || entries.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const mood = entry.metadata?.dominantMood || "Reflective";
    counts[mood] = (counts[mood] || 0) + 1;
  }

  const total = entries.length;
  return Object.entries(counts)
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function exportEntriesAsMarkdown(entries: JournalEntry[]): string {
  let md = `# Reflect - Journal & Reflection Archive\nExported on: ${new Date().toLocaleString()}\nTotal Reflections: ${entries.length}\n\n---\n\n`;

  for (const entry of entries) {
    const dateStr = new Date(entry.createdAt).toLocaleString();
    md += `## ${entry.metadata.sessionTitle || "Journal Reflection"}\n`;
    md += `**Date:** ${dateStr}  \n`;
    md += `**Dominant Mood:** ${entry.metadata.dominantMood}  \n`;
    md += `**Thematic Tags:** ${entry.metadata.tags?.join(", ") || "None"}  \n`;
    md += `**Executive Realization:** ${entry.metadata.briefSummary}  \n\n`;

    md += `### 📝 Your Journal Entry\n${entry.userPrompt}\n\n`;
    md += `### 🌿 Reflection Coach Feedback\n${entry.reflectionReply}\n\n`;

    if (entry.thread && entry.thread.length > 0) {
      md += `### 💬 Exploration Dialogue\n`;
      for (const msg of entry.thread) {
        const speaker = msg.role === "assistant" ? "Coach" : "You";
        md += `> **${speaker}** (${new Date(msg.timestamp).toLocaleTimeString()}):\n> ${msg.content}\n\n`;
      }
    }

    md += `---\n\n`;
  }

  return md;
}

export function exportSingleEntryAsMarkdown(entry: JournalEntry): string {
  const dateStr = new Date(entry.createdAt).toLocaleString();
  let md = `# ${entry.metadata.sessionTitle || "Journal Reflection"}\n`;
  md += `**Date:** ${dateStr} | **Mood:** ${entry.metadata.dominantMood}\n`;
  md += `**Tags:** ${entry.metadata.tags?.join(", ") || ""}\n\n`;
  md += `> **Core Realization:** ${entry.metadata.briefSummary}\n\n`;
  md += `### 📝 Your Entry\n${entry.userPrompt}\n\n`;
  md += `### 🌿 Coach Reflection & Guidance\n${entry.reflectionReply}\n\n`;

  if (entry.thread && entry.thread.length > 0) {
    md += `### 💬 Deepening Thread\n`;
    for (const msg of entry.thread) {
      const speaker = msg.role === "assistant" ? "Coach" : "You";
      md += `**${speaker}:** ${msg.content}\n\n`;
    }
  }

  return md;
}

export function exportEntriesAsJson(entries: JournalEntry[]): string {
  return JSON.stringify(sanitizeData(entries), null, 2);
}

export function parseImportedJson(jsonStr: string): JournalEntry[] {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid backup format: Expected an array of journal entries.");
  }
  for (const item of parsed) {
    if (!item.id || !item.createdAt || !item.userPrompt || !item.reflectionReply || !item.metadata) {
      throw new Error("Invalid journal entry structure in imported file.");
    }
  }
  return parsed as JournalEntry[];
}
