import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  RefreshCw,
  Wand2,
  Maximize2,
  Minimize2,
  Trash2,
  HelpCircle,
  Mic,
  MicOff,
  Keyboard,
  Compass,
} from "lucide-react";
import { PromptTemplate } from "../types";
import { DEFAULT_PROMPT_TEMPLATES, MOOD_OPTIONS } from "../data/promptTemplates";
import { requestCustomPrompt } from "../services/api";

interface ReflectionEditorProps {
  initialText: string;
  onTextChange: (text: string) => void;
  selectedMood: string;
  onMoodChange: (mood: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}

export const ReflectionEditor: React.FC<ReflectionEditorProps> = ({
  initialText,
  onTextChange,
  selectedMood,
  onMoodChange,
  onSubmit,
  isLoading,
  errorMessage,
  onRetry,
}) => {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<PromptTemplate | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customMoodInput, setCustomMoodInput] = useState(selectedMood || "Seeking Clarity");
  const [customTopicInput, setCustomTopicInput] = useState("");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptGenError, setPromptGenError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const wordCount = initialText.trim() ? initialText.trim().split(/\s+/).length : 0;
  const charCount = initialText.length;

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          onTextChange(
            initialText ? `${initialText} ${finalTranscript.trim()}` : finalTranscript.trim()
          );
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [initialText, onTextChange]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech-to-text dictation is not supported in this browser.");
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
      }
    }
  };

  const handleApplyTemplate = (template: PromptTemplate) => {
    setActiveTemplate(template);
    onMoodChange(template.suggestedMood);
    if (!initialText.trim()) {
      onTextChange(template.starterText + " ");
    } else {
      onTextChange(initialText + "\n\n" + template.starterText + " ");
    }
  };

  const handleGenerateCustomPrompt = async () => {
    try {
      setIsGeneratingPrompt(true);
      setPromptGenError(null);
      const generated = await requestCustomPrompt(
        customMoodInput,
        customTopicInput || "General Daily Reflection"
      );
      handleApplyTemplate(generated);
      setShowCustomModal(false);
      setCustomTopicInput("");
    } catch (err: any) {
      setPromptGenError(err?.message || "Could not generate prompt right now.");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Handle Cmd+Enter / Ctrl+Enter keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isLoading && initialText.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div
      className={`transition-all duration-300 ${
        isFocusMode
          ? "fixed inset-0 z-50 bg-white dark:bg-black p-4 sm:p-10 overflow-y-auto flex flex-col justify-center max-w-4xl mx-auto"
          : "w-full"
      }`}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 sm:p-7 transition-all">
        {/* Top bar with Mood selector & Focus mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1.5">
              Current Emotional State / Sensation
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {MOOD_OPTIONS.map((m) => {
                const isSelected = selectedMood === m.label;
                return (
                  <button
                    key={m.label}
                    id={`mood-btn-${m.label.toLowerCase().replace(/\s+/g, "-")}`}
                    type="button"
                    onClick={() => onMoodChange(isSelected ? "" : m.label)}
                    className={`text-xs px-2.5 py-1 rounded-full border border-black transition-none cursor-pointer bg-black text-white ${
                      isSelected
                        ? "ring-2 ring-neutral-400 font-bold"
                        : "opacity-80"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Voice Dictation Button */}
            <button
              id="voice-dictate-btn"
              type="button"
              onClick={toggleRecording}
              title={isRecording ? "Stop dictation" : "Voice Dictate Stream of Consciousness"}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-black font-medium transition-none cursor-pointer bg-black text-white ${
                isRecording
                  ? "ring-2 ring-neutral-400 animate-pulse"
                  : "opacity-90"
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
              <span className="text-white">{isRecording ? "Listening..." : "Dictate"}</span>
            </button>

            <button
              id="generate-custom-prompt-btn"
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-black text-white border border-black font-medium transition-none cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-white" />
              <span className="text-white">Tailor Prompt</span>
            </button>

            <button
              id="toggle-focus-mode-btn"
              type="button"
              onClick={() => setIsFocusMode(!isFocusMode)}
              title={isFocusMode ? "Exit Focus Mode (Esc)" : "Focus Mode"}
              className="p-1.5 bg-black text-white border border-black rounded-lg transition-none cursor-pointer"
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>

        {/* Guided Framework Chips */}
        <div className="py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> Guided Reflection Starters:
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {DEFAULT_PROMPT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                id={`template-${tmpl.id}`}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="shrink-0 text-left px-3 py-1.5 rounded-xl bg-black text-white border border-black transition-none text-xs cursor-pointer"
              >
                <span className="font-semibold text-white block">
                  {tmpl.title}
                </span>
                <span className="text-[11px] text-neutral-300 line-clamp-1">
                  {tmpl.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Journal Textarea */}
        <div className="relative mt-2">
          <textarea
            id="journal-input-textarea"
            rows={isFocusMode ? 14 : 9}
            value={initialText}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What is weighing on your mind or stirring underneath? Describe the situation, how your body feels, or the conflict you are wrestling with..."
            className="w-full p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 text-sm sm:text-base leading-relaxed resize-y focus:outline-hidden transition-all shadow-inner"
          />

          {/* Word count & Clear buffer */}
          <div className="flex items-center justify-between mt-2 text-xs text-neutral-400 dark:text-neutral-500">
            <div className="flex items-center gap-3">
              <span>
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </span>
              <span>•</span>
              <span>{charCount} characters</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-neutral-400">
                <Keyboard className="w-3 h-3" /> ⌘ + Enter to submit
              </span>
            </div>

            {initialText.trim() && (
              <button
                id="clear-journal-text-btn"
                type="button"
                onClick={() => onTextChange("")}
                className="flex items-center gap-1 px-2.5 py-1 bg-black text-white border border-black rounded-lg text-xs transition-none cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Clear Draft</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Banner with Guaranteed Retry */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-black dark:border-white text-black dark:text-white text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Notice:</span>
              <span>{errorMessage}</span>
            </div>
            <button
              id="retry-reflection-btn"
              type="button"
              onClick={onRetry}
              className="px-3 py-1 bg-black text-white border border-black rounded-lg font-medium shrink-0 flex items-center gap-1 transition-none cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-white" />
              <span className="text-white">Retry</span>
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>The coach validates emotions, extracts implicit themes, and asks 1–2 constructive questions.</span>
          </div>

          <button
            id="submit-reflection-btn"
            type="button"
            disabled={isLoading || !initialText.trim()}
            onClick={onSubmit}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-none cursor-pointer bg-black text-white border border-black ${
              isLoading || !initialText.trim()
                ? "opacity-50 cursor-not-allowed"
                : "shadow-sm active:scale-[0.98]"
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span className="text-white">Coach is reflecting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-white">Unpack & Reflect with Coach</span>
                <Send className="w-3.5 h-3.5 ml-0.5 text-white" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tailor Prompt Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-300 dark:border-neutral-700 max-w-md w-full p-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-black dark:text-white" />
                <h3 className="font-semibold text-black dark:text-white">
                  Generate Bespoke Prompt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="bg-black text-white border border-black text-xs px-2 py-1 rounded-lg cursor-pointer transition-none"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
              Tell the coach what you are experiencing, and it will construct a tailored introspection starter.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Dominant Sensation / Mood
                </label>
                <input
                  id="custom-prompt-mood-input"
                  type="text"
                  value={customMoodInput}
                  onChange={(e) => setCustomMoodInput(e.target.value)}
                  placeholder="e.g. Overwhelmed with decisions, Restless, Self-critical"
                  className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-black dark:text-white focus:outline-hidden focus:border-black dark:focus:border-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Specific Topic / Focus Area
                </label>
                <input
                  id="custom-prompt-topic-input"
                  type="text"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  placeholder="e.g. Work boundary, Career transition, Burnout, Relationship friction"
                  className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-black dark:text-white focus:outline-hidden focus:border-black dark:focus:border-white"
                />
              </div>
            </div>

            {promptGenError && (
              <p className="mt-3 text-xs text-black dark:text-white font-medium border-l-2 border-black dark:border-white pl-2">
                {promptGenError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-xs bg-black text-white border border-black rounded-lg cursor-pointer transition-none"
              >
                Cancel
              </button>
              <button
                id="generate-bespoke-prompt-submit-btn"
                type="button"
                disabled={isGeneratingPrompt}
                onClick={handleGenerateCustomPrompt}
                className="px-4 py-1.5 text-xs bg-black text-white border border-black rounded-lg font-medium flex items-center gap-1.5 transition-none disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingPrompt ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-white" />
                    <span className="text-white">Crafting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-white" />
                    <span className="text-white">Generate Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
