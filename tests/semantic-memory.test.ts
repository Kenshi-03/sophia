import { calculateDecayedImportance } from '../lib/ai/memory/decay-manager';
import { MemoryNode } from '@/types/memory';

describe('Semantic Memory & Context Assembly Tests', () => {
  describe('Exponential Importance Decay Calculation', () => {
    it('should maintain base importance for newly created memories', () => {
      const node: MemoryNode = {
        id: 'node-1',
        content: 'Baru belajar teknik Pomodoro hari ini.',
        category: 'Focus',
        tags: ['pomodoro'],
        importance: 1.0,
        decayRate: 0.01,
        createdAt: new Date(), // Created just now
      };
      
      const score = calculateDecayedImportance(node);
      expect(score).toBeCloseTo(1.0, 3);
    });

    it('should decay importance over time based on decayRate', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const node: MemoryNode = {
        id: 'node-2',
        content: 'Rapat besar dengan klien asing.',
        category: 'Client',
        tags: ['meeting'],
        importance: 1.0,
        decayRate: 0.05, // High decay rate
        createdAt: tenDaysAgo,
      };
      
      // Expected = 1.0 * e^(-0.05 * 10) = e^(-0.5) = 0.6065
      const score = calculateDecayedImportance(node);
      expect(score).toBeCloseTo(0.6065, 3);
    });

    it('should decay slow-decaying semantic memories much slower', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const node: MemoryNode = {
        id: 'node-3',
        content: 'Saya cenderung lelah setelah 4 jam kerja mendalam.',
        category: 'Behavioral',
        tags: ['pattern'],
        importance: 0.8,
        decayRate: 0.002, // Semantic slow decay
        createdAt: thirtyDaysAgo,
      };
      
      // Expected = 0.8 * e^(-0.002 * 30) = 0.8 * e^(-0.06) = 0.8 * 0.94176 = 0.7534
      const score = calculateDecayedImportance(node);
      expect(score).toBeCloseTo(0.7534, 3);
    });
  });
});
