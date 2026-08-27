import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Send,
  MessageSquareQuote,
  FileDown,
  RefreshCw,
  Tag,
  Lightbulb,
  Gauge,
  CheckCheck,
} from "lucide-react";
import { JournalEntry, ChatMessage } from "../types";
import { exportSingleEntryAsMarkdown } from "../utils/storage";

interface CoachReplyCardProps {
  entry: JournalEntry;
  onFollowUpSubmit: (messageText: string) => Promise<void>;
  isSubmittingFollowUp: boolean;
  onToggleBookmark: (id: string) => void;
}

export const CoachReplyCard: React.FC<CoachReplyCardProps> = ({
  entry,
  onFollowUpSubmit,
  isSubmittingFollowUp,
  onToggleBookmark,
}) => {
  const [followUpText, setFollowUpText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<0.8 | 1.0 | 1.2>(1.0);

  // Stop speech if entry changes or component unmounts
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [entry.id]);

  const handleCopy = () => {
    const fullText = `Session: ${entry.metadata.sessionTitle}\nMood: ${entry.metadata.dominantMood}\nSummary: ${entry.metadata.briefSummary}\n\nCoach Feedback:\n${entry.reflectionReply}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeech = () => {
    if (!("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const cleanText = entry.reflectionReply
        .replace(/[#*`_~\[\]]/g, "")
        .replace(/https?:\/\/\S+/g, "");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = speechRate;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const cycleSpeechRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    let nextRate: 0.8 | 1.0 | 1.2 = 1.0;
    if (speechRate === 1.0) nextRate = 1.2;
    else if (speechRate === 1.2) nextRate = 0.8;
    else nextRate = 1.0;

    setSpeechRate(nextRate);
    if (isSpeaking) {
      // restart with new rate
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setTimeout(() => {
        const cleanText = entry.reflectionReply
          .replace(/[#*`_~\[\]]/g, "")
          .replace(/https?:\/\/\S+/g, "");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = nextRate;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }, 50);
    }
  };

  const handleSendFollowUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!followUpText.trim() || isSubmittingFollowUp) return;
    const textToSend = followUpText;
    setFollowUpText("");
    await onFollowUpSubmit(textToSend);
  };

  const handleFollowUpKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendFollowUp();
    }
  };

  const handleDownloadMarkdown = () => {
    const md = exportSingleEntryAsMarkdown(entry);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reflection-${(entry.metadata.sessionTitle || "session")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Primary Reflection Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-md p-6 sm:p-8 transition-colors">
        {/* Header Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700">
                {entry.metadata.dominantMood || "Reflective"}
              </span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {new Date(entry.createdAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}{" "}
                •{" "}
                {new Date(entry.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {entry.metadata.sessionTitle}
            </h2>
          </div>

          {/* Card Top Actions */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
            {/* Speech Player & Speed Control */}
            <div className="flex items-center rounded-xl bg-black border border-black p-0.5">
              <button
                id="speech-toggle-btn"
                type="button"
                onClick={handleToggleSpeech}
                title={isSpeaking ? "Stop Voice" : "Listen to Reflection"}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-none cursor-pointer bg-black text-white"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-white" />
                    <div className="flex items-center gap-0.5 h-3">
                      <span className="w-0.5 bg-white rounded-full audio-wave-bar" />
                      <span className="w-0.5 bg-white rounded-full audio-wave-bar" />
                      <span className="w-0.5 bg-white rounded-full audio-wave-bar" />
                    </div>
                    <span className="text-white">Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Listen</span>
                  </>
                )}
              </button>

              <button
                id="speech-speed-btn"
                type="button"
                onClick={cycleSpeechRate}
                title={`Reading speed: ${speechRate}x (Click to cycle)`}
                className="px-1.5 py-1 text-[10px] text-white font-mono font-semibold cursor-pointer bg-black transition-none"
              >
                {speechRate}x
              </button>
            </div>

            <button
              id="bookmark-entry-btn"
              type="button"
              onClick={() => onToggleBookmark(entry.id)}
              title={entry.bookmarked ? "Remove Bookmark" : "Bookmark Reflection"}
              className="p-2 rounded-xl bg-black text-white border border-black transition-none cursor-pointer"
            >
              {entry.bookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-white fill-current" />
              ) : (
                <Bookmark className="w-4 h-4 text-white" />
              )}
            </button>

            <button
              id="copy-entry-btn"
              type="button"
              onClick={handleCopy}
              title="Copy Summary & Coach Feedback"
              className="p-2 rounded-xl bg-black text-white border border-black transition-none cursor-pointer"
            >
              {copied ? (
                <CheckCheck className="w-4 h-4 text-white" />
              ) : (
                <Copy className="w-4 h-4 text-white" />
              )}
            </button>

            <button
              id="export-single-md-btn"
              type="button"
              onClick={handleDownloadMarkdown}
              title="Download as Markdown File"
              className="p-2 rounded-xl bg-black text-white border border-black transition-none cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Thematic Tags */}
        {entry.metadata.tags && entry.metadata.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 my-4">
            {entry.metadata.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1"
              >
                <Tag className="w-3 h-3 text-neutral-400" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Executive Realization Summary Callout */}
        <div className="my-5 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border-l-4 border-black dark:border-white flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-black dark:text-white shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-0.5">
              Core Realization
            </span>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-snug">
              {entry.metadata.briefSummary}
            </p>
          </div>
        </div>

        {/* User's Original Prompt / Context */}
        <div className="mb-6 p-4 rounded-xl bg-neutral-50/70 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1.5">
            Your Reflection:
          </span>
          <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
            {entry.userPrompt}
          </p>
        </div>

        {/* Coach Reflection Reply (Formatted Markdown) */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
            <Sparkles className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span>Coach's Insight & Thought Exercises</span>
          </div>

          <div className="text-neutral-900 dark:text-neutral-100 text-sm sm:text-base leading-relaxed">
            <div className="markdown-body">
              <Markdown>{entry.reflectionReply}</Markdown>
            </div>
          </div>
        </div>
      </div>

      {/* Ongoing Dialogue / Follow-up Thread */}
      {entry.thread && entry.thread.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            <MessageSquareQuote className="w-4 h-4" />
            <span>Exploration Thread ({entry.thread.length})</span>
          </div>

          {entry.thread.map((msg: ChatMessage) => {
            const isCoach = msg.role === "assistant";
            return (
              <div
                key={msg.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isCoach
                    ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 ml-0 sm:mr-8"
                    : "bg-neutral-100 dark:bg-neutral-950 border-neutral-300 dark:border-neutral-800 ml-4 sm:ml-12"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-xs font-semibold ${
                      isCoach
                        ? "text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {isCoach ? "Reflection Coach" : "You"}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                  <div className="markdown-body">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Follow-up Response Form */}
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5">
        <form onSubmit={handleSendFollowUp} className="space-y-3">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
            <span>Deepen the Reflection (Answer the coach's questions or share more):</span>
            <span className="text-[11px] text-neutral-400 font-normal">
              Answers are automatically saved
            </span>
          </label>

          <div className="relative">
            <textarea
              id="followup-input-textarea"
              rows={3}
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              onKeyDown={handleFollowUpKeyDown}
              placeholder="Type your answer to the open-ended questions above, or reflect on what resonates... (⌘ + Enter to send)"
              className="w-full p-3.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 text-xs sm:text-sm resize-none focus:outline-hidden focus:border-black dark:focus:border-white transition-all"
            />
          </div>

          <div className="flex justify-end">
            <button
              id="submit-followup-btn"
              type="submit"
              disabled={isSubmittingFollowUp || !followUpText.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-none cursor-pointer bg-black text-white border border-black ${
                isSubmittingFollowUp || !followUpText.trim()
                  ? "opacity-50 cursor-not-allowed"
                  : "active:scale-98"
              }`}
            >
              {isSubmittingFollowUp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span className="text-white">Deepening...</span>
                </>
              ) : (
                <>
                  <span className="text-white">Send Follow-up</span>
                  <Send className="w-3.5 h-3.5 text-white" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
