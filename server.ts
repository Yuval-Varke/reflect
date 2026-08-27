import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// 1. TOP-LEVEL REQUEST DESERIALIZATION (Ordering Guarantee)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Security & sanitization helper: Strip undefined and sanitize objects
function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

// Resilient Model Fallback Ladder Protocol
const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash"
];

// Lazy GenAI Client Initializer
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const SYSTEM_INSTRUCTION = `You are an empathetic, insightful, and grounded journaling companion and reflection coach. Your purpose is to help the user unpack their thoughts, gain clarity, process emotions, and discover actionable personal insights.

### Interaction Guidelines:
1. Tone & Demeanor:
   - Warm, supportive, and non-judgmental, but concise and grounded.
   - Avoid generic platitudes, toxic positivity, or overly dramatic therapy jargon.
   - Match the user's emotional depth and energy level.

2. Reflective Coaching:
   - Acknowledge and validate the core emotion or premise directly.
   - Highlight implicit themes, patterns, or underlying assumptions in their reflection.
   - Offer 1–2 constructive, open-ended questions or small actionable thought exercises to deepen their introspection.

3. Output Format Requirements:
   - Always respond strictly in valid JSON format matching the schema below.
   - Do not wrap the JSON in conversational filler or preambles outside the JSON structure.

### JSON Response Schema:
{
  "reflectionReply": "Your conversational reflection, feedback, and thought-provoking questions to the user in clean Markdown format.",
  "metadata": {
    "sessionTitle": "A concise 3-6 word title summarizing the core topic of the reflection.",
    "dominantMood": "A 1-2 word label representing the user's primary emotional state (e.g., Anxious, Motivated, Overwhelmed, Grateful, Restless).",
    "tags": ["Array", "of", "2-4", "relevant", "thematic", "tags"],
    "briefSummary": "A crisp 1-2 sentence synthesis capturing the user's current situation and core realization."
  }
}`;

// Standard Helper Implementation: Resilient Fallback Generator
async function generateContentWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  systemInstruction: string = SYSTEM_INSTRUCTION
): Promise<{ text: string; usedModel: string }> {
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`[Gemini Fallback] Attempting model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reflectionReply: {
                type: Type.STRING,
                description: "Conversational reflection, feedback, and open-ended questions in clean Markdown format.",
              },
              metadata: {
                type: Type.OBJECT,
                properties: {
                  sessionTitle: {
                    type: Type.STRING,
                    description: "Concise 3-6 word title summarizing core topic.",
                  },
                  dominantMood: {
                    type: Type.STRING,
                    description: "1-2 word label of primary emotional state (e.g., Anxious, Motivated, Overwhelmed, Grateful, Restless).",
                  },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "2-4 relevant thematic tags.",
                  },
                  briefSummary: {
                    type: Type.STRING,
                    description: "Crisp 1-2 sentence synthesis capturing the user's current situation and core realization.",
                  },
                },
                required: ["sessionTitle", "dominantMood", "tags", "briefSummary"],
              },
            },
            required: ["reflectionReply", "metadata"],
          },
          temperature: 0.7,
        },
      });

      const responseText = response.text?.trim() || "";
      if (responseText) {
        return { text: responseText, usedModel: modelName };
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${modelName} encountered error:`, err?.message || err);
      lastError = err;
      // Recoverable error matrix check: 503, 429, 404, 500 or standard API errors
      continue;
    }
  }

  throw lastError || new Error("All models in the resilient fallback ladder failed to generate content.");
}

// 2. API ROUTES

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Reflect Journaling Companion API",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Primary Reflection & Coaching Endpoint
app.post("/api/reflect", async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const rawBody = (req.body && typeof req.body === "object") ? req.body : {};
    const text = typeof rawBody.text === "string" ? rawBody.text.trim() : "";
    const thread = Array.isArray(rawBody.thread) ? rawBody.thread : [];
    const moodContext = typeof rawBody.moodContext === "string" ? rawBody.moodContext.trim() : "";
    const promptCategory = typeof rawBody.promptCategory === "string" ? rawBody.promptCategory.trim() : "";

    if (!text && thread.length === 0) {
      return res.status(400).json({
        error: "Input text is required to generate a reflection.",
      });
    }

    if (text.length > 20000) {
      return res.status(400).json({
        error: "Journal entry exceeds the maximum character limit (20,000 characters).",
      });
    }

    const ai = getGenAIClient();

    // Construct enriched conversation prompt preserving context while defending against prompt injections
    let fullPrompt = "";
    if (thread.length > 0) {
      fullPrompt += "Prior Context / Ongoing Reflection Thread:\n";
      for (const msg of thread.slice(-6)) { // keep recent context
        const role = msg.role === "assistant" ? "Reflection Coach" : "Journaler";
        const content = typeof msg.content === "string" ? msg.content.slice(0, 3000) : "";
        fullPrompt += `[${role}]: ${content}\n\n`;
      }
      fullPrompt += `User's latest journal reflection/follow-up response:\n"${text}"\n`;
    } else {
      fullPrompt = `User's Journal Reflection:\n"${text}"\n`;
    }

    if (moodContext) {
      fullPrompt += `\nUser's self-selected starting mood/focus: ${moodContext}`;
    }
    if (promptCategory) {
      fullPrompt += `\nJournaling framework category: ${promptCategory}`;
    }

    fullPrompt += "\n\nPlease deliver your grounded reflection feedback, theme detection, and 1-2 constructive introspection exercises strictly in the requested JSON structure.";

    const { text: jsonOutput, usedModel } = await generateContentWithFallback(ai, fullPrompt);

    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonOutput);
    } catch (parseError) {
      // Clean fallback if markdown code blocks were included
      const cleaned = jsonOutput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      parsedResult = JSON.parse(cleaned);
    }

    // Clean payload sanitization
    const sanitizedResponse = sanitizePayload({
      reflectionReply: parsedResult.reflectionReply || "Thank you for sharing your thoughts. Let's take a moment to reflect on what you've written.",
      metadata: {
        sessionTitle: parsedResult.metadata?.sessionTitle || "Journal Reflection",
        dominantMood: parsedResult.metadata?.dominantMood || "Reflective",
        tags: Array.isArray(parsedResult.metadata?.tags) ? parsedResult.metadata.tags : ["Journaling", "Introspection"],
        briefSummary: parsedResult.metadata?.briefSummary || "Exploration of current thoughts and emotions.",
      },
      modelUsed: usedModel,
      processedAt: Date.now(),
    });

    return res.json(sanitizedResponse);
  } catch (error: any) {
    console.error("[/api/reflect Error]", error);
    const errorMessage = error?.message || "Failed to generate reflection from coach.";
    return res.status(500).json({
      error: errorMessage,
      hint: !process.env.GEMINI_API_KEY ? "Please verify GEMINI_API_KEY is configured in Settings > Secrets." : "Please try submitting again.",
    });
  }
});

// Prompt Inspiration Generator Endpoint
app.post("/api/generate-prompt", async (req: Request, res: Response) => {
  try {
    const rawBody = (req.body && typeof req.body === "object") ? req.body : {};
    const mood = typeof rawBody.mood === "string" ? rawBody.mood.trim() : "General Clarity";
    const topic = typeof rawBody.topic === "string" ? rawBody.topic.trim() : "Daily Life";

    const ai = getGenAIClient();
    const promptRequest = `You are a thoughtful reflection coach. Generate a bespoke, deep, yet grounded journaling prompt tailored for someone experiencing or focusing on:
Mood: ${mood}
Area/Topic: ${topic}

Respond with a JSON object:
{
  "title": "A short 3-5 word prompt title",
  "category": "grounding" | "clarity" | "emotions" | "decisions" | "growth",
  "description": "Why this reflection helps right now (1 sentence)",
  "starterText": "A warm, open-ended sentence starter to begin typing into the journal",
  "suggestedMood": "${mood}"
}`;

    const promptInstruction = "You generate grounded, insightful reflection starters. Always respond in valid JSON.";

    const { text: jsonOutput } = await generateContentWithFallback(ai, promptRequest, promptInstruction);
    let parsed;
    try {
      parsed = JSON.parse(jsonOutput);
    } catch {
      const cleaned = jsonOutput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return res.json(sanitizePayload(parsed));
  } catch (error: any) {
    console.error("[/api/generate-prompt Error]", error);
    return res.status(500).json({
      error: error?.message || "Could not generate custom prompt.",
    });
  }
});

// 3. VITE MIDDLEWARE & STATIC ASSET SERVING
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Reflect Journaling Companion running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
