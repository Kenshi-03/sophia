import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const apiKey = process.env.GEMINI_API_KEY || '';

export const aiClient = new GoogleGenerativeAI(apiKey);

export function getGeminiModel(modelName: string = 'gemini-2.0-flash') {
  return aiClient.getGenerativeModel({ model: modelName });
}
