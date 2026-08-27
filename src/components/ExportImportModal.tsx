import React, { useState } from "react";
import { Download, Upload, FileText, FileCode, Check, AlertCircle, Sparkles, X } from "lucide-react";
import { JournalEntry } from "../types";
import { exportEntriesAsMarkdown, exportEntriesAsJson, parseImportedJson } from "../utils/storage";

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onImportSuccess: (imported: JournalEntry[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  entries,
  onImportSuccess,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadMarkdown = () => {
    const content = exportEntriesAsMarkdown(entries);
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reflect-journal-archive-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const content = exportEntriesAsJson(entries);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reflect-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseImportedJson(text);
        onImportSuccess(parsed);
        setImportStatus(`Successfully restored ${parsed.length} journal reflections.`);
        setImportError(null);
        setTimeout(() => {
          onClose();
          setImportStatus(null);
        }, 1500);
      } catch (err: any) {
        setImportError(err?.message || "Failed to parse JSON backup file.");
        setImportStatus(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="font-serif text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Data & Backup Management
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Export your reflections or restore previous backup archives
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-black text-white border border-black rounded-lg cursor-pointer transition-none"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Export Section */}
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
            Export Reflections ({entries.length} stored)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              id="export-markdown-btn"
              type="button"
              disabled={entries.length === 0}
              onClick={handleDownloadMarkdown}
              className="p-4 rounded-xl border border-black bg-black text-white transition-none text-left group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1.5 text-white font-semibold text-xs">
                <FileText className="w-4 h-4 text-white" />
                <span className="text-white">Markdown Archive</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Formatted .md document with coach replies and summaries for Obsidian or Notion.
              </p>
            </button>

            <button
              id="export-json-btn"
              type="button"
              disabled={entries.length === 0}
              onClick={handleDownloadJson}
              className="p-4 rounded-xl border border-black bg-black text-white transition-none text-left group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1.5 text-white font-semibold text-xs">
                <FileCode className="w-4 h-4 text-white" />
                <span className="text-white">Full JSON Backup</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Structured JSON file containing full reflection metadata, threads, and timestamps.
              </p>
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
            Restore / Import Backup
          </span>

          <label
            htmlFor="restore-json-input"
            className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-neutral-50 dark:bg-neutral-950 transition-all"
          >
            <Upload className="w-5 h-5 text-neutral-400 mb-2" />
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Click or drag to restore JSON backup
            </span>
            <span className="text-[11px] text-neutral-400 mt-0.5">
              Restores your previous sessions without overwriting unrelated storage
            </span>
            <input
              id="restore-json-input"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Status Alerts */}
        {importStatus && (
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-white text-neutral-900 dark:text-neutral-100 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-black dark:text-white shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {importError && (
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-400 text-neutral-900 dark:text-neutral-100 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-black dark:text-white shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-black text-white border border-black rounded-xl text-xs font-medium cursor-pointer transition-none"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
