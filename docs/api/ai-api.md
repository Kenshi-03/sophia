# AI Command API

## 1. Chat Execution

* **Endpoint**: `/api/ai/chat`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "query": "Suggest a work schedule based on my calendar",
    "userId": "default-user-id"
  }
  ```
* **Response**:
  ```json
  {
    "query": "...",
    "agentType": "schedule",
    "response": "Gemini response text suggestions..."
  }
  ```

## 2. Get Focus Recommendation

* **Endpoint**: `/api/ai/recommendation?load=42`
* **Method**: `GET`
* **Response**:
  ```json
  {
    "status": "Optimal Focus State",
    "suggestion": "..."
  }
  ```

## 3. Plan Work Schedule

* **Endpoint**: `/api/ai/planner`
* **Method**: `POST`
* **Response**:
  ```json
  {
    "userId": "...",
    "recommendations": ["..."]
  }
  ```
