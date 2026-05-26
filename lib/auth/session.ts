// Next-Auth v5 session getter utility
import { auth } from './auth';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

export function isDevCognitionModeEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DEV_COGNITION_MODE === 'true';
}

function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

async function ensureDevUserAndSeeds() {
  // 1. Ensure dev user exists in database
  const mockUser = await prisma.user.upsert({
    where: { id: "dev-user" },
    update: {},
    create: {
      id: "dev-user",
      email: "dev@sophia.local",
      name: "SOPHIA Dev User User"
    }
  });

  // 2. Ensure CognitiveProfile exists (for profile context retrieval)
  await prisma.cognitiveProfile.upsert({
    where: { userId: mockUser.id },
    update: {},
    create: {
      userId: mockUser.id,
      overloadTolerance: 70.0,
      recoveryQuality: 50.0,
      productivityConsistency: 50.0,
      deepWorkTiming: "08:00-11:00",
      procrastinationIndex: 0.15,
    }
  });

  // 3. Lazy seed memories if count is 0
  const count = await prisma.memoryNode.count({
    where: { userId: mockUser.id }
  });

  if (count === 0) {
    const devMockMemories = [
      {
        content: "Current development roadmap: Phase D — Context Budget Engine. Focus areas: D1.2-A Token Budgeting, D1.2-B Context Scoring, D1.2-C Pruning, D1.2-D Diversity, D1.2-E Assembly.",
        category: "Roadmap",
        tags: ["roadmap", "phase-d"],
        importance: 1.0,
        decayRate: 0.001,
        sourceType: "chat",
        visibility: "private",
        taxonomy: "roadmap",
        reliability: 1.0,
        memoryType: "semantic",
      },
      {
        content: "SOPHIA active session continuity anchor. The developer is currently building and testing DEV_COGNITION_MODE capabilities.",
        category: "Focus",
        tags: ["focus", "dev-mode"],
        importance: 0.95,
        decayRate: 0.002,
        sourceType: "chat",
        visibility: "private",
        taxonomy: "roadmap",
        reliability: 1.0,
        memoryType: "semantic",
      },
      {
        content: "Refleksi: Token estimation harus deterministic. Heuristik 4 char/token + correction factors menghasilkan akurasi ~90%.",
        category: "Development",
        tags: ["reflection", "tokenization"],
        importance: 0.80,
        decayRate: 0.02,
        sourceType: "chat",
        visibility: "private",
        taxonomy: "reflection",
        reliability: 0.90,
        memoryType: "semantic",
      },
      {
        content: "Refleksi: Token estimation harus deterministic. Heuristik 4 char/token + correction factors menghasilkan akurasi ~90%.",
        category: "Development",
        tags: ["reflection", "tokenization"],
        importance: 0.80,
        decayRate: 0.02,
        sourceType: "chat",
        visibility: "private",
        taxonomy: "reflection",
        reliability: 0.90,
        memoryType: "semantic",
      },
      {
        content: "Katanya ada kelas tambahan hari Sabtu tapi belum dikonfirmasi oleh dosen. Informasi belum pasti.",
        category: "Academics",
        tags: ["unconfirmed", "low-reliability"],
        importance: 0.10,
        decayRate: 0.06,
        sourceType: "chat",
        visibility: "private",
        taxonomy: "reflection",
        reliability: 0.20,
        memoryType: "episodic",
      }
    ];

    for (const mem of devMockMemories) {
      await prisma.memoryNode.create({
        data: {
          content: mem.content,
          category: mem.category,
          tags: mem.tags,
          importance: mem.importance,
          decayRate: mem.decayRate,
          sourceType: mem.sourceType,
          visibility: mem.visibility,
          taxonomy: mem.taxonomy,
          contentHash: computeContentHash(mem.content),
          reliability: mem.reliability,
          memoryType: mem.memoryType,
          userId: mockUser.id,
        }
      });
    }
  }

  return mockUser;
}

export async function getCurrentUser() {
  if (isDevCognitionModeEnabled()) {
    return ensureDevUserAndSeeds();
  }

  const session = await auth();
  if (!session?.user?.email) return null;
  
  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

// Redirects to /login if the user is not logged in.
// Useful inside server components (layouts/pages)
export async function requireSession() {
  if (isDevCognitionModeEnabled()) {
    const mockUser = await ensureDevUserAndSeeds();
    return {
      session: {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      user: mockUser
    };
  }

  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  
  if (!user) {
    redirect('/login');
  }
  
  return { session, user };
}
