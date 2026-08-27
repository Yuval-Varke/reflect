import React, { useState, useMemo } from "react";
import {
  Search,
  Tag,
  Bookmark,
  Trash2,
  Calendar,
  FileText,
  ArrowRight,
  Lightbulb,
  Sparkles,
  Filter,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react";
import { JournalEntry } from "../types";
import { MOOD_OPTIONS } from "../data/promptTemplates";

interface JournalHistoryProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onStartNew: () => void;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onToggleBookmark,
  onStartNew,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>("");
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "thread">("newest");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Extract all distinct tags from entries
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    entries.forEach((e) => {
      e.metadata?.tags?.forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet).slice(0, 15);
  }, [entries]);

  // Filter & Sort entries
  const filteredEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = entry.metadata?.sessionTitle?.toLowerCase().includes(query);
        const textMatch = entry.userPrompt?.toLowerCase().includes(query);
        const summaryMatch = entry.metadata?.briefSummary?.toLowerCase().includes(query);
        const coachMatch = entry.reflectionReply?.toLowerCase().includes(query);
        const tagMatch = entry.metadata?.tags?.some((t) => t.toLowerCase().includes(query));
        if (!titleMatch && !textMatch && !summaryMatch && !coachMatch && !tagMatch) {
          return false;
        }
      }

      // Mood filter
      if (selectedMoodFilter && entry.metadata?.dominantMood !== selectedMoodFilter) {
        return false;
      }

      // Tag filter
      if (selectedTagFilter && !entry.metadata?.tags?.includes(selectedTagFilter)) {
        return false;
      }

      // Bookmark filter
      if (onlyBookmarked && !entry.bookmarked) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "oldest") return a.createdAt - b.createdAt;
      if (sortBy === "title") {
        return (a.metadata?.sessionTitle || "").localeCompare(b.metadata?.sessionTitle || "");
      }
      if (sortBy === "thread") {
        return (b.thread?.length || 0) - (a.thread?.length || 0);
      }
      // default: newest
      return b.createdAt - a.createdAt;
    });
  }, [entries, searchQuery, selectedMoodFilter, selectedTagFilter, onlyBookmarked, sortBy]);

  const targetEntry = useMemo(
    () => entries.find((e) => e.id === deleteTargetId),
    [entries, deleteTargetId]
  );

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections, insights, tags..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-black dark:focus:border-white"
            />
          </div>

          {/* Controls: Bookmarks & Sorting */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start flex-wrap">
            {/* Sort selector */}
            <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
              <select
                id="history-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-neutral-700 dark:text-neutral-300 focus:outline-hidden text-xs font-medium cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title (A-Z)</option>
                <option value="thread">Most Follow-ups</option>
              </select>
            </div>

            {/* Bookmark filter toggle */}
            <button
              id="filter-bookmarks-btn"
              type="button"
              onClick={() => setOnlyBookmarked(!onlyBookmarked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-black transition-none cursor-pointer bg-black text-white ${
                onlyBookmarked
                  ? "ring-2 ring-neutral-400 font-bold"
                  : "opacity-85"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 text-white ${onlyBookmarked ? "fill-current" : ""}`} />
              <span className="text-white">Bookmarked ({entries.filter((e) => e.bookmarked).length})</span>
            </button>

            {(selectedMoodFilter || selectedTagFilter || searchQuery || onlyBookmarked) && (
              <button
                id="reset-filters-btn"
                type="button"
                onClick={() => {
                  setSelectedMoodFilter("");
                  setSelectedTagFilter("");
                  setSearchQuery("");
                  setOnlyBookmarked(false);
                }}
                className="px-2.5 py-1.5 text-xs bg-black text-white border border-black rounded-xl cursor-pointer transition-none font-medium"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Mood filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <span className="text-xs text-neutral-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Mood:
          </span>
          <button
            id="filter-mood-all-btn"
            type="button"
            onClick={() => setSelectedMoodFilter("")}
            className={`text-xs px-2.5 py-0.5 rounded-full border border-black transition-none cursor-pointer bg-black text-white ${
              !selectedMoodFilter
                ? "ring-2 ring-neutral-400 font-bold"
                : "opacity-80"
            }`}
          >
            All ({entries.length})
          </button>
          {MOOD_OPTIONS.map((m) => {
            const count = entries.filter((e) => e.metadata?.dominantMood === m.label).length;
            if (count === 0 && !selectedMoodFilter) return null;
            const isSelected = selectedMoodFilter === m.label;
            return (
              <button
                key={m.label}
                id={`filter-mood-${m.label.toLowerCase().replace(/\s+/g, "-")}`}
                type="button"
                onClick={() => setSelectedMoodFilter(isSelected ? "" : m.label)}
                className={`text-xs px-2.5 py-0.5 rounded-full border border-black transition-none cursor-pointer bg-black text-white ${
                  isSelected
                    ? "ring-2 ring-neutral-400 font-bold"
                    : "opacity-80"
                }`}
              >
                {m.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Tag filter chips if available */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-xs text-neutral-400 font-medium mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags:
            </span>
            {allTags.map((tag) => (
              <button
                key={tag}
                id={`filter-tag-${tag.toLowerCase().replace(/\s+/g, "-")}`}
                type="button"
                onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? "" : tag)}
                className={`text-[11px] px-2 py-0.5 rounded-md border border-black transition-none cursor-pointer bg-black text-white ${
                  selectedTagFilter === tag
                    ? "ring-2 ring-neutral-400 font-bold"
                    : "opacity-80"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-black text-white mx-auto flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            {entries.length === 0 ? "Your journal archive is empty" : "No reflections match your filters"}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6">
            {entries.length === 0
              ? "Start by sharing what is on your mind in the Reflection Studio."
              : "Try adjusting your search terms or clearing selected mood filters."}
          </p>
          {entries.length === 0 && (
            <button
              id="start-first-reflection-btn"
              type="button"
              onClick={onStartNew}
              className="px-4 py-2 bg-black text-white border border-black rounded-xl text-xs sm:text-sm font-medium transition-none inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white">Begin First Reflection</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              id={`history-card-${entry.id}`}
              onClick={() => onSelectEntry(entry)}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-5 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Card Top Metadata */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700">
                      {entry.metadata?.dominantMood || "Reflective"}
                    </span>
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(entry.id)}
                      className="p-1.5 bg-black text-white border border-black rounded-lg transition-none cursor-pointer"
                      title={entry.bookmarked ? "Bookmarked" : "Bookmark"}
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 text-white ${
                          entry.bookmarked ? "fill-current" : ""
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(entry.id)}
                      className="p-1.5 bg-black text-white border border-black rounded-lg transition-none cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Session Title */}
                <h3 className="font-serif text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  {entry.metadata?.sessionTitle}
                </h3>

                {/* Realization Summary */}
                <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 mb-3 flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-black dark:text-white shrink-0 mt-0.5" />
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                    {entry.metadata?.briefSummary}
                  </p>
                </div>

                {/* User snippet */}
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 italic mb-3">
                  "{entry.userPrompt}"
                </p>

                {/* Tags */}
                {entry.metadata?.tags && entry.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {entry.metadata.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* View/Open Action */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  {entry.thread?.length
                    ? `${entry.thread.length} follow-up notes`
                    : "Single reflection"}
                </span>
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                  <span>Open Session</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Avoid window.confirm in iframe) */}
      {deleteTargetId && targetEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-300 dark:border-neutral-700 max-w-sm w-full p-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 text-black dark:text-white mb-3">
              <AlertTriangle className="w-6 h-6 text-black dark:text-white" />
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Delete Reflection?
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-5 leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-neutral-900 dark:text-neutral-100">
                "{targetEntry.metadata?.sessionTitle}"
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-3 py-1.5 text-xs bg-black text-white border border-black rounded-lg cursor-pointer transition-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEntry(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-1.5 text-xs bg-black text-white border border-black rounded-lg font-medium cursor-pointer transition-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
