'use client'

import useAiStore, { ChatMessage } from '@/stores/use-ai-store';

export function useAiChat() {
  const { messages, isGenerating, activeAgent, addMessage, setGenerating, setActiveAgent } = useAiStore();

  const sendQuery = async (query: string) => {
    if (!query.trim()) return;

    // 1. Add user query message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: query,
    };
    addMessage(userMsg);
    setGenerating(true);

    try {
      // 2. Query backend agent router
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const data = await res.json();
        // Set agent response details
        if (data.agentType) {
          setActiveAgent(data.agentType);
        }
        
        const assistantMsg: ChatMessage = {
          id: Math.random().toString(),
          role: 'assistant',
          content: data.response || 'No response generated.',
        };
        addMessage(assistantMsg);
      }
    } catch (err) {
      console.error('AI query execution failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return {
    messages,
    isGenerating,
    activeAgent,
    sendQuery,
  };
}
export default useAiChat;
