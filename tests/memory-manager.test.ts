import { MemoryManager } from '../lib/ai/memory/memory-manager';
import prisma from '../lib/db/prisma';
import { MemorySourceType } from '@prisma/client';

describe('MemoryManager Governance & Indexing Integration Tests', () => {
  const userId = 'test-user-memory-manager';

  beforeAll(async () => {
    // Cleanup any existing test data for this test user
    await prisma.memoryNode.deleteMany({ where: { userId } });
    await prisma.note.deleteMany({ where: { userId } });
    await prisma.thought.deleteMany({ where: { userId } });
    
    // Ensure test user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: 'test-manager@sophia.local',
        name: 'Test Manager User',
      }
    });
  });

  afterEach(async () => {
    // Cleanup after each test
    await prisma.memoryNode.deleteMany({ where: { userId } });
    await prisma.note.deleteMany({ where: { userId } });
    await prisma.thought.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    // Remove test user
    try {
      await prisma.user.delete({ where: { id: userId } });
    } catch (e) {
      // Ignored if user not found
    }
  });

  describe('1. Note Lifecycle & Indexing', () => {
    it('should save a note to DB and index it as a MemoryNode', async () => {
      const note = await MemoryManager.createNote(userId, {
        title: 'Core Memory Concept',
        content: 'This is a note about semantic memory mapping.',
        category: 'Ideas',
        notebook: 'Research',
        tags: ['semantic', 'indexing']
      });

      expect(note).toBeDefined();
      expect(note.title).toBe('Core Memory Concept');

      // Verify associated MemoryNode exists
      const memoryNode = await prisma.memoryNode.findFirst({
        where: {
          userId,
          sourceId: note.id,
          sourceType: MemorySourceType.NOTE,
        }
      });

      expect(memoryNode).toBeDefined();
      expect(memoryNode!.content).toBe('# Core Memory Concept\n\nThis is a note about semantic memory mapping.');
      expect(memoryNode!.category).toBe('Research');
      expect(memoryNode!.originType).toBe('NOTE');
      expect(memoryNode!.originContext).toBe('dashboard_notes');
    });

    it('should update the associated MemoryNode when a note is updated', async () => {
      const note = await MemoryManager.createNote(userId, {
        title: 'Initial Note Title',
        content: 'Initial content',
        category: 'Ideas',
        notebook: 'Personal',
        tags: ['init']
      });

      const updatedNote = await MemoryManager.updateNote(note.id, userId, {
        title: 'Updated Note Title',
        content: 'Updated content',
        category: 'References',
        notebook: 'Research',
        tags: ['updated']
      });

      expect(updatedNote.title).toBe('Updated Note Title');

      // Verify the MemoryNode has updated content and tags
      const memoryNode = await prisma.memoryNode.findFirst({
        where: {
          userId,
          sourceId: note.id,
          sourceType: MemorySourceType.NOTE,
        }
      });

      expect(memoryNode).toBeDefined();
      expect(memoryNode!.content).toBe('# Updated Note Title\n\nUpdated content');
      expect(memoryNode!.category).toBe('Research');
      expect(memoryNode!.tags).toContain('updated');
    });

    it('should soft-delete a note and delete its associated MemoryNode from retrieval substrate', async () => {
      const note = await MemoryManager.createNote(userId, {
        title: 'Temporary Note',
        content: 'Will be deleted',
      });

      await MemoryManager.deleteNote(note.id, userId);

      // Note should be soft-deleted in DB
      const dbNote = await prisma.note.findUnique({
        where: { id: note.id }
      });
      expect(dbNote!.deletedAt).not.toBeNull();
      expect(dbNote!.isArchived).toBe(true);

      // Associated MemoryNode should be completely removed from retrieval
      const memoryNode = await prisma.memoryNode.findFirst({
        where: {
          userId,
          sourceId: note.id,
          sourceType: MemorySourceType.NOTE,
        }
      });
      expect(memoryNode).toBeNull();
    });
  });

  describe('2. Thought Throttling & Duplicate Suppression', () => {
    it('should suppress exact duplicate thoughts within the 10-minute cooldown window', async () => {
      const content = 'This is a unique quick thought capture.';
      const thought1 = await MemoryManager.createThought(userId, content);
      
      // Attempting to save the same thought immediately should return the existing thought instance
      const thought2 = await MemoryManager.createThought(userId, content);

      expect(thought2.id).toBe(thought1.id);

      // Verify only one MemoryNode is created
      const count = await prisma.memoryNode.count({
        where: {
          userId,
          sourceType: MemorySourceType.THOUGHT,
        }
      });
      expect(count).toBe(1);
    });

    it('should throttle and throw an error when thought rate limit is exceeded', async () => {
      // Max thoughts is 5 per 10 minutes.
      // Create 5 different thoughts
      for (let i = 0; i < 5; i++) {
        await MemoryManager.createThought(userId, `Different thought iteration ${i}`);
      }

      // The 6th insertion should be throttled and throw an error
      await expect(
        MemoryManager.createThought(userId, 'One thought too many')
      ).rejects.toThrow('Thought rate limit exceeded');
    });
  });
});
