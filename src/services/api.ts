import { ReflectionResponse, ChatMessage, PromptTemplate } from "../types";

export interface ReflectPayload {
  text: string;
  thread?: ChatMessage[];
  moodContext?: string;
  promptCategory?: string;
}

export async function requestReflection(payload: ReflectPayload): Promise<ReflectionResponse> {
  const response = await fetch("/api/reflect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: payload.text || "",
      thread: payload.thread || [],
      moodContext: payload.moodContext || "",
      promptCategory: payload.promptCategory || "",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || `Server responded with status ${response.status}`;
    const hint = errorData.hint ? ` (${errorData.hint})` : "";
    throw new Error(`${message}${hint}`);
  }

  const data = await response.json();
  return data as ReflectionResponse;
}

export async function requestCustomPrompt(mood: string, topic: string): Promise<PromptTemplate> {
  const response = await fetch("/api/generate-prompt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mood, topic }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate tailored prompt");
  }

  const data = await response.json();
  return {
    id: `custom-${Date.now()}`,
    title: data.title || "Tailored Reflection",
    category: data.category || "clarity",
    description: data.description || "Generated for your current state",
    starterText: data.starterText || "",
    suggestedMood: data.suggestedMood || mood,
  };
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}
