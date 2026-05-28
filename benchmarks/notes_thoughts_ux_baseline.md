# Cognition UX Governance Baseline — Notes & Thoughts Separation

This document freezes the design guidelines, architectural semantics, and synchronization behaviors for the `Note` and `Thought` cognition artifacts in SOPHIA. It serves as the baseline for future D3 retrieval arbitration, context assembly, and memory ecology governance.

---

## 1. Cognition Role UX Semantics

Notes and Thoughts serve distinct cognitive purposes in the user's digital memory ecology:

* **Notes**:
  * **Role**: Structured long-term knowledge and organized information.
  * **UX Pattern**: Long-form structured editor requiring a Title, Category (Ideas, References, Reminders), and Notebook Folder (Personal, Research, Academics). Markdown format.
  * **Cognitive Feeling**: Durable workspace, heavy reflection, static knowledge.
* **Thoughts**:
  * **Role**: Quick cognition capture, stream-of-consciousness, and temporary episodic reasoning traces.
  * **UX Pattern**: Lightweight capture modal (textarea only, optional tags, no titles, no notebook/category required). Vertical timeline stream on the right side of the screen.
  * **Cognitive Feeling**: Frictionless scratchpad, real-time episodic timeline, temporary and dynamic.

---

## 2. Visual & Structural Separation Rules

* **Dual-Column Workspace**:
  * Wide screens (`xl` and up) must display Notes/Folders and the note editor on the left column (`xl:col-span-8`), and the Thoughts stream on the right column (`xl:col-span-4`).
  * On smaller viewport sizes, layout columns must stack gracefully to preserve mobile readability, placing Thoughts below the Notes Grid.
* **Distinct Accents**:
  * Notes are styled using bento-style cards categorised under their specific Accent Colors (Ideas = Primary purple, References = Tertiary blue, Reminders = Secondary mint green).
  * Thoughts are displayed in a continuous stream-like vertical feed with a left timeline rail (`border-[#4edea3]/70`) and light, minimalist cards to indicate their episodic nature.
* **Cognitive Help Section**:
  * A persistent, small info dashboard must remain visible below the header to visually prevent semantic confusion between Notes and Thoughts.

---

## 3. Stream & Query Limits

To prevent cognitive bloat and rendering degradation over time:
* **Initial Load Limit**: The Recent Thoughts widget fetches and renders a maximum of **20 items** initially.
* **Pagination & Lazy Loading**: Fetching older thoughts must happen via offset-based pagination. A "Load More" trigger is displayed when more thoughts exist in the database.
* **Throttling & Cooldowns (Backend enforced)**:
  * Duplicate thoughts (identical content) from the same user are suppressed within a **10-minute cooldown window**.
  * Rate-limiting throttles insertion to a maximum of **5 thoughts per 10 minutes** to prevent spamming quick-capture interfaces.

---

## 4. Retrieval & Indexing Synchronization

* **Notes**:
  * **Retrieval Importance**: High (`1.0` default weighting).
  * **Memory Type**: Semantic.
  * **Indexing Payload**: `# ${note.title}\n\n${note.content}`.
  * **Category Mapping**: Mapped to the selected Notebook name.
* **Thoughts**:
  * **Retrieval Importance**: Low-to-Medium (`0.8` default weighting).
  * **Memory Type**: Episodic.
  * **Indexing Payload**: The raw content of the thought.
  * **Category Mapping**: Defaults to `Personal` category.

---

## 5. Deletion & Cleanup Synchronization Rules

* **Orphan Prevention**: Deleting a `Note` or `Thought` must trigger a cleanup in the retrieval layer.
* **Implementation Details**:
  * The deletion server action (`deleteNoteAction` or `deleteThoughtAction`) soft-deletes the record in the persistence layer (`Note` or `Thought` database table).
  * It must synchronously locate and delete the associated `MemoryNode` from the retrieval substrate to prevent orphan retrieval artifacts and semantic vector pollution.
* **Optimistic UI Deletion**:
  * In the UI, thoughts must immediately disappear when clicked. If deletion fails on the server, the item must be restored in its correct chronological order, notifying the user of the error.
