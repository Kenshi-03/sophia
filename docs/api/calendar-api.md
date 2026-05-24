# Calendar API

## 1. Get Today's Schedule

* **Endpoint**: `/api/calendar/today`
* **Method**: `GET`
* **Response**:
  ```json
  [
    { "id": "1", "title": "Morning Prep", "startTime": "...", "endTime": "..." }
  ]
  ```

## 2. Sync Google Calendar

* **Endpoint**: `/api/calendar/sync`
* **Method**: `POST`
* **Response**:
  ```json
  { "success": true, "message": "..." }
  ```
