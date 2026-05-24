# AI System Architecture

SOPHIA (Systematic Organization for Personal Higher Information Analysis) utilizes a **non-agentic multi-agent system** for digital assistance. Non-agentic means agents act strictly as information analyzers and suggest options instead of taking action autonomously.

## Core Agents

1. **Schedule Analyser Agent**: Parses Google Calendar schedules to outline cognitive loads.
2. **Memory Manager Agent**: Categorizes note documents and schedules into semantic points.
3. **Productivity Advisor Agent**: Offers focus suggestions based on calculated loads.

## Orchestration Flow

```
[User Query] 
     │
     ▼
[AI Router] ── (Routes query to specific agent type)
     │
     ▼
[Context Manager] ── (Retrieves relevant facts & calendar logs)
     │
     ▼
[Response Generator] ── (Calls Google Gemini API with context and prompts)
     │
     ▼
[Markdown Response]
```
