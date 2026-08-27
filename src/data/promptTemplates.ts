import { PromptTemplate } from "../types";

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "emotional-unpack",
    title: "Emotional Unpacking",
    category: "emotions",
    description: "Deconstruct tangled feelings into clear, acknowledged realities.",
    suggestedMood: "Overwhelmed",
    starterText: "Right now, I am feeling a wave of... What seems to be triggering this underneath the surface is...",
  },
  {
    id: "decision-clarity",
    title: "Decision Crossroad",
    category: "decisions",
    description: "Examine conflicting paths, hidden fears, and core values.",
    suggestedMood: "Restless",
    starterText: "I am currently stuck between two choices or directions. What's holding me back is...",
  },
  {
    id: "gratitude-anchor",
    title: "Grounded Gratitude",
    category: "grounding",
    description: "Anchor your mind in quiet micro-moments and authentic appreciation.",
    suggestedMood: "Grateful",
    starterText: "Three specific, quiet things that brought me genuine peace or joy today are...",
  },
  {
    id: "values-alignment",
    title: "Values & Boundaries",
    category: "growth",
    description: "Notice where your energy is being drained and align with your true priorities.",
    suggestedMood: "Motivated",
    starterText: "Where did I say yes today when I truly meant no? What boundary do I need to reinforce?",
  },
  {
    id: "shadow-resistance",
    title: "Facing Resistance",
    category: "clarity",
    description: "Investigate procrastination, avoidance, or inner self-doubt with compassion.",
    suggestedMood: "Anxious",
    starterText: "The thing I have been avoiding doing or admitting to myself is... The story I am telling myself about it is...",
  },
  {
    id: "daily-synthesis",
    title: "Evening Decompression",
    category: "grounding",
    description: "Empty your mental cache before restful sleep.",
    suggestedMood: "Reflective",
    starterText: "Looking back at today, what surprised me, what drained me, and what is one insight I want to carry into tomorrow?",
  },
];

export const MOOD_OPTIONS = [
  { label: "Reflective", color: "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white" },
  { label: "Overwhelmed", color: "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white" },
  { label: "Anxious", color: "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white" },
  { label: "Grateful", color: "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white" },
  { label: "Motivated", color: "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white" },
  { label: "Restless", color: "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white" },
  { label: "Peaceful", color: "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white" },
  { label: "Seeking Clarity", color: "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white" },
];
