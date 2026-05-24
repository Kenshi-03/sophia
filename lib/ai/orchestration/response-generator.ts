import { generateGatewayResponse } from '../gateway/maia_gateway';
import { SYSTEM_PROMPT } from '../prompts/system';

export async function generateAiResponse(userQuery: string, context: string): Promise<string> {
  try {
    const prompt = `Context:\n${context}\n\nUser Query: ${userQuery}`;
    
    const response = await generateGatewayResponse(prompt, {
      systemInstruction: SYSTEM_PROMPT,
    });
    
    return response.text || 'No response generated.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Cognitive processor offline. Please check your configurations.';
  }
}
