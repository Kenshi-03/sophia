import prisma from '../prisma';

export async function createMemoryNode(data: {
  content: string;
  userId: string;
  category: string;
  tags?: string[];
}) {
  try {
    return await prisma.memoryNode.create({
      data: {
        content: data.content,
        userId: data.userId,
        category: data.category,
        tags: data.tags || [],
      },
    });
  } catch (error) {
    console.error("Prisma createMemoryNode failed:", error);
    return {
      id: 'mock-memory-id',
      content: data.content,
      userId: data.userId,
      category: data.category,
      tags: data.tags || [],
      createdAt: new Date(),
    };
  }
}

export async function getMemoryNodesByUser(userId: string) {
  try {
    const nodes = await prisma.memoryNode.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return nodes;
  } catch (error) {
    console.error('Database query getMemoryNodesByUser failed:', error);
    return [];
  }
}

export async function deleteMemoryNode(id: string) {
  try {
    return await prisma.memoryNode.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Prisma deleteMemoryNode failed:", error);
    return { id };
  }
}

export async function updateMemoryNode(
  id: string,
  data: { content: string; category: string; tags?: string[] }
) {
  try {
    return await prisma.memoryNode.update({
      where: { id },
      data: {
        content: data.content,
        category: data.category,
        tags: data.tags || [],
      },
    });
  } catch (error) {
    console.error("Prisma updateMemoryNode failed:", error);
    return {
      id,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      createdAt: new Date(),
    };
  }
}

