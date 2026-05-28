# Academic Timeline Governance Baseline

This document freezes the architectural rules, behavior assumptions, and database invariants for SOPHIA's Academic Schedule System (Class Planner). Future timeline reasoners, cognitive analyzers, and calendar sync coordination engines must adhere strictly to these frozen governance parameters.

---

## 1. Sequence Integrity and Immutability

- **Immutable Identity**: The `sequenceNumber` represents the deterministic order of a course session in the semester timeline. It MUST NEVER be modified after creation.
- **Overriding vs. Mutating**: Individual session parameter modifications (date, time, mode, room, link, notes) are treated as *overrides* and MUST preserve the same `sequenceNumber`.
- **Structural Re-alignments**: The active timeline sequence can only be structurally updated (e.g., sessions added or removed) via explicit `SEQUENCE_REBUILD` mutations, never silently or dynamically.

---

## 2. Shift Semantics and versioning

- **Cascading Shift**: Shifting remaining sessions starting from sequence `S` forward by `D` days shifts the planned date of all active sessions from sequence `S` to `N` by `D` days.
- **Timeline Versioning**: The `timelineVersion` counter on the `Course` model starts at `1` and MUST be incremented on every cascading shift, sequence rebuild, or bulk reschedule.
- **Mutation Cooldown**: A cooldown period of **5 seconds** is enforced for cascading shifts on a single course to prevent accidental semester timeline corruption by repeated calls, unless explicitly bypassed by user confirmation.

---

## 3. Soft-Delete and Observability

- **Soft-Delete Schema**: The `Course` and `CourseSession` models support nullable `deletedAt` fields. Deleting a course or session MUST set this timestamp rather than deleting records destructively.
- **Append-Only Logs**: All timeline mutations (OVERRIDE, RESCHEDULE, SHIFT_FORWARD, SHIFT_BACKWARD, SKIP, etc.) MUST append an entry to `TimelineMutationLog`. This log is strictly immutable and acts as a replay substrate for AI reasoners.

---

## 4. Frozen Cognitive Load Governance

To prevent analytics drift and ensure consistent cognitive load tracking, the following academic session types have stable, hardcoded roles in the Schedule Analyzer:

| Session Type | Weight Category | Analytical Load Weight / Behavior |
| :--- | :--- | :--- |
| `MID_EXAM` | Exam | Counts as Exam (+30% flat load penalty), counts as Focus Hours |
| `FINAL_EXAM` | Exam | Counts as Exam (+30% flat load penalty), counts as Focus Hours |
| `QUIZ` | Deadline/Quiz | Counts as Deadline/Task (+15% flat load penalty), counts as Focus Hours |
| `PRESENTATION` | Deadline/Quiz | Counts as Deadline/Task (+15% flat load penalty), counts as Focus Hours |
| `LAB` | Focus | Counts as Focus Hours (standard weight) |
| `CLASS` | Focus | Counts as Focus Hours (standard weight) |
| `REPLACEMENT` | Focus | Counts as Focus Hours (standard weight) |
| `HOLIDAY` | Empty | Contributes 0% load; ignored in Focus Hours |

---

## 5. Collision Severity Matrix

Global collision checks evaluated against CourseSessions and general calendar events classify conflicts as follows:

- **`CRITICAL`**: Time overlap with an active session of type `MID_EXAM` or `FINAL_EXAM`.
- **`HIGH`**: Time overlap with standard classes, quizzes, presentations, or general meetings, or a room double-booking conflict.
- **`MEDIUM`**: Time overlap with a deep-work block.
- **`LOW`**: General overlaps with low-impact personal/social items.

Overlapping sessions are permitted to coexist but MUST trigger visibility warning banners in the UI during scheduling operations.
