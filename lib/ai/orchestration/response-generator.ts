import { generateGatewayResponse } from '../gateway/maia_gateway';
import { SYSTEM_PROMPT, RETRIEVED_DETAIL_SYSTEM_PROMPT } from '../prompts/system';
import { AIMode } from '../types';
import { detectRetrievalIntent } from '../working-memory/arbitration';

export async function generateAiResponse(
  userQuery: string,
  context: string,
  options?: { model?: string; aiMode?: AIMode; customApiKey?: string | null }
): Promise<string> {
  try {
    const prompt = `Context:\n${context}\n\nUser Query: ${userQuery}`;
    const isRetrieval = detectRetrievalIntent(userQuery);
    const systemInstruction = isRetrieval ? RETRIEVED_DETAIL_SYSTEM_PROMPT : SYSTEM_PROMPT;
    
    const response = await generateGatewayResponse(prompt, {
      systemInstruction: systemInstruction,
      model: options?.model,
      aiMode: options?.aiMode,
      customApiKey: options?.customApiKey,
    });
    
    return response.text || 'No response generated.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Cognitive processor offline. Please check your configurations.';
  }
}
