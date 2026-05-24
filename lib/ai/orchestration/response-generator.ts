import { getGeminiModel } from '../gemini';
import { SYSTEM_PROMPT } from '../prompts/system';

export async function generateAiResponse(userQuery: string, context: string): Promise<string> {
  try {
    const model = getGeminiModel();
    const prompt = `${SYSTEM_PROMPT}\n\nContext:\n${context}\n\nUser Query: ${userQuery}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || 'No response generated.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Cognitive processor offline. Please check your configurations.';
  }
}
