export const AI_MODELS = {
  DEFAULT: 'gemini-2.0-flash',
  PLANNER: 'gemini-2.0-flash',
  PRODUCTIVITY: 'gemini-2.0-flash',
  MEMORY: 'gemini-2.0-flash',
} as const;

export type AiModelType = typeof AI_MODELS[keyof typeof AI_MODELS];
