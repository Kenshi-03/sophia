import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AiState {
  messages: ChatMessage[];
  isGenerating: boolean;
  activeAgent: string;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setGenerating: (isGenerating: boolean) => void;
  setActiveAgent: (activeAgent: string) => void;
}

export const useAiStore = create<AiState>((set) => ({
  messages: [
    { id: '1', role: 'assistant', content: 'Hello! I am ready to process your requests. You can ask me to analyze your calendar, fetch permanent memory logs, or structure focus notes.' },
  ],
  isGenerating: false,
  activeAgent: 'Schedule Analyser',
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setActiveAgent: (activeAgent) => set({ activeAgent }),
}));
export default useAiStore;
