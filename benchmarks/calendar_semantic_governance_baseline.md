# Calendar Semantic Governance Baseline

This document freezes the cognitive scheduling category semantics, database mappings, and schedule analyzer logic for SOPHIA. Maintaining these boundaries guarantees deterministic schedule reasoning, replay-safe analysis, and cognitive-load calculations.

---

## 1. Cognitive Category Type Semantics
All user-defined scheduling configurations map to a deterministic `CognitiveCategoryType` enum value:

| Enum Value | Visual/Cognitive Role | Typical Load Weight | Focus / Recovery Classification |
|---|---|---|---|
| `GENERAL` | Standard/general calendar items | `35` (Moderate) | Neutral |
| `DEEP_WORK` | Intellectually intensive focused sessions | `75` (High) | Focus Mode |
| `MEETING` | Interactive coordination & calls | `35` (Moderate) | Neutral |
| `HEALTH` | Physical workouts and health activities | `-15` (Negative) | Recovery Mode |
| `RECOVERY` | Sleep, rest, and meditation | `-30` (Negative) | Recovery Mode |
| `ACADEMIC` | Lectures, classrooms, and coursework | `35` (Moderate) | Focus Mode |
| `PERSONAL` | Free time and leisure activities | `-10` (Negative) | Recovery Mode |
| `ADMIN` | Email, scheduling, and bookkeeping tasks | `20` (Low) | Neutral |
| `PROJECT` | Coordination and general dev sprints | `35` (Moderate) | Neutral |

---

## 2. Seeded Defaults
SOPHIA seeds four default active cognitive calendar configurations for new accounts:
1. **General** (Type: `GENERAL`, color: `#64748B`, default, mapped to `"primary"`)
2. **Deep Work** (Type: `DEEP_WORK`, color: `#2563EB`, isDefault: `true`, mapped to `"primary"`)
3. **Meeting** (Type: `MEETING`, color: `#8B5CF6`, default, mapped to `"primary"`)
4. **Personal** (Type: `PERSONAL`, color: `#F97316`, default, mapped to `"primary"`)

> [!IMPORTANT]
> Seeding does not execute active OAuth sync or assume calendar privileges; it serves as a lightweight cognitive directory.

---

## 3. Category Resolution Rules
Event categories are resolved deterministically:
* **Creation Flow**: The user selects a visual `cognitiveCategory` name in the dropdown. The backend maps `calendarId` to retrieve the active `CalendarConfig` record, extracting its `googleCalendarId` for API synchronization.
* **Fallback Mapping**: If an event references a missing, disabled, or soft-deleted configuration:
  - The event remains visible in timelines.
  - The cognitive load score calculations automatically redirect to the `GENERAL` category profile.
  - Diagnostic logs emit warnings: `[Cognitive Diagnostics Alert] Event [Title] references an inactive or deleted category. Falling back to GENERAL.`

---

## 4. Dashboard Warning Behavior
The dashboard warning widget runs live diagnostic checks and warns on the following states:
1. **OAuth Disconnected**: User has not linked a Google account in the database (high warning).
2. **No Configs**: Mappings list is empty or completely soft-deleted (critical block warning).
3. **Seeded Defaults Only**: User has not customized configs (subtle info warning).
4. **Inactive/Invalid Mappings**: Configurations with empty IDs or marked `isActive: false` (moderate action warning).

---

## 5. Event Routing Integrity
* **Active Verification**: POST/PATCH operations reject events targeting configurations where `isActive: false` or `deletedAt` is populated.
* **Raw ID Exposure**: Google Calendar ID strings are considered low-level details. They are hidden from the frontend forms and dropdown selects.
