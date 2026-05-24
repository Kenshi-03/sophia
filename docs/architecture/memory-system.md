# Permanent Memory System

The memory system inside SOPHIA catalog facts across Google Calendars and work notebooks, storing them into the relational database.

## Key Modules

* **Save Memory**: Inserts new facts into the Prisma database with semantic tag classifications.
* **Retrieve Memory**: Filters existing facts using keyword overlaps and recency rankings.
* **Context Builder**: Prepares context strings from memories to enhance agent prompts.

## Memory Schema

Memory nodes are modeled with `content`, `category` (Academics, Personal, Research), and an array of `tags` strings.
