# Memory Ecology Governance Baseline

This document freezes the schema structures, indexing rules, duplicate suppression bounds, and lineage rules for SOPHIA's memory system. This stable baseline ensures that future D3 retrieval arbitration algorithms can operate deterministically.

---

## 1. Frozen Schemas

### A. Note Schema
```prisma
model Note {
  id         String    @id @default(cuid())
  title      String
  content    String    @db.Text
  category   String    @default("Ideas") // Ideas, References, Reminders
  notebook   String    @default("Personal") // Personal, Research, Academics
  tags       String[]
  isArchived Boolean   @default(false)
  deletedAt  DateTime?

  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([userId])
}
```

### B. Thought Schema
```prisma
model Thought {
  id                String    @id @default(cuid())
  content           String    @db.Text
  tags              String[]
  visibility        String    @default("PRIVATE")
  retrievalEligible Boolean   @default(true)
  isArchived        Boolean   @default(false)
  deletedAt         DateTime?

  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([userId])
}
```

### C. MemoryNode Additions
```prisma
enum MemorySourceType {
  NOTE
  THOUGHT
  EPISODIC
  SYSTEM
  INFERRED
}

// Injected fields in MemoryNode:
// sourceType     MemorySourceType? @default(EPISODIC)
// sourceId       String?
// indexingStatus String            @default("PENDING")
// indexedAt      DateTime?
// originType     String?
// originContext  String?
```

---

## 2. Frozen Indexing Pipeline

| Source Object | Substrate Model | Substrate Type (`sourceType`) | Substrate Content Mapping | Substrate Taxonomy (`taxonomy`) | Substrate MemoryType |
|---|---|---|---|---|---|
| `Note` | `MemoryNode` | `NOTE` | `# ${Note.title}\n\n${Note.content}` | `"note"` | `semantic` |
| `Thought` | `MemoryNode` | `THOUGHT` | `${Thought.content}` | `"thought"` | `episodic` |

*Note: All created/updated `MemoryNode` records automatically queue background vector embedding generation (`generate-embedding` job in BullMQ).*

---

## 3. Frozen Throttling & Duplicate Suppression

### A. Cooldown Windows
- **Duplicate Suppression window:** 10 minutes.
- **Action:** If the user creates a `Thought` with identical content (after trimming) within 10 minutes of an existing thought, the insertion is suppressed, and the existing instance is returned to prevent database clutter and retrieval pollution.

### B. Thought Throttling
- **Throttling window:** 10 minutes.
- **Threshold:** Maximum of 5 thoughts per window.
- **Action:** If a user attempts to create a 6th thought within the 10-minute window, the request is blocked and throws a `Thought rate limit exceeded` error.

---

## 4. Frozen Retrieval Eligibility & Deletion Rules

- **Thought Visibility:** By default set to `PRIVATE`.
- **Retrieval Eligibility:** If `retrievalEligible` on `Thought` is `false`, it is excluded from indexing into `MemoryNode` and will not be retrieved during cognitive arbitration.
- **Soft Deletion Cascade:** 
  - When a `Note` or `Thought` is soft-deleted (`deletedAt` set, `isArchived = true`), the corresponding `MemoryNode` is **completely removed** from the retrieval substrate to maintain clean cognition focus.
