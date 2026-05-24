# Permanent Memory API

## 1. Save Fact Node

* **Endpoint**: `/api/memory/save`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "content": "NextJS Route Group parenthesis",
    "category": "Research",
    "tags": ["web-dev"]
  }
  ```
* **Response**:
  ```json
  {
    "id": "...",
    "content": "...",
    "category": "Research",
    "tags": ["web-dev"]
  }
  ```

## 2. Search Memories

* **Endpoint**: `/api/memory/search?query=parenthesis`
* **Method**: `GET`
* **Response**:
  ```json
  [
    { "id": "...", "content": "..." }
  ]
  ```
