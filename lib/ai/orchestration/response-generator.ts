import { generateRouterResponse } from '../providers/router';
import { SYSTEM_PROMPT } from '../prompts/system';

export async function generateAiResponse(userQuery: string, context: string): Promise<string> {
  try {
    const prompt = `Context:\n${context}\n\nUser Query: ${userQuery}`;
    
    const responseText = await generateRouterResponse(prompt, {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });
    
    return responseText || 'No response generated.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Cognitive processor offline. Please check your configurations.';
  }
}
