# Emergency Response Dashboard

## Overview

The **Emergency Response Dashboard** is a real-time incident analysis platform designed to process accident footage and provide actionable emergency response recommendations. By integrating advanced AI models, automated notifications, and incident tracking, it streamlines emergency services and ensures faster response times. Historical data storage and analysis enable continuous improvements in incident management.

---

## Key Features

### Core Features
- **🎥 Video Upload & Processing**
  - Accepts video formats: MP4, AVI, MOV
  - Automatically extracts critical key frames from videos
  - Real-time video processing status tracking

- **🔍 Intelligent Analysis**
  - Scene analysis powered by **AWS Bedrock Llama Vision**
  - Automated hazard detection
  - Severity assessment with actionable insights
  - Emergency service recommendations (e.g., ambulance, fire, police)

### Emergency Response Integration
- **📞 Automated Emergency Calls**
  - Integration with emergency response teams
  - Automated voice calls via **Amazon Connect**
  - Real-time incident detail transmission to responders
  - Priority-based routing for critical cases

### Location & Mapping
- **🗺️ Incident Location Mapping**
  - Interactive map integration (using Mapbox or Google Maps)
  - Precise location marking of accidents
  - Visualized routes for emergency teams
  - Nearby emergency service locations displayed dynamically

### Incident Tracking & History
- **💾 Incident Logging with DynamoDB**
  - Secure storage of all incidents
  - Detailed responder feedback and notes
  - Action tracking for improved transparency
  - Historical data for analysis and reporting

---

## Tech Stack

### Frontend
- **React** with **Vite** for fast development and performance
- **Tailwind CSS** for a responsive UI
- **shadcn/ui components** for rich, reusable elements
- **Lucide Icons** for clear visual communication
- **Mapbox/Google Maps API** for location and route visualization

### Backend
- **FastAPI** for efficient API development
- **OpenCV** for video processing and key frame extraction
- **AWS Services:**
  - **S3**: Video storage
  - **Bedrock**: AI-powered analysis
  - **DynamoDB**: Incident logging and tracking
  - **Amazon Connect**: Automated emergency calls
  - **Location Services**: Real-time mapping and nearby service discovery
- **Python**: Image and frame processing logic

---

## Database Schema (DynamoDB)

```json
{
  "IncidentTable": {
    "incident_id": "string (Primary Key)",
    "timestamp": "string",
    "location": {
      "latitude": "number",
      "longitude": "number",
      "address": "string"
    },
    "analysis": {
      "severity": "string",
      "hazards": ["string"],
      "services_required": ["string"]
    },
    "ai_report": "string",
    "responder_notes": [
      {
        "timestamp": "string",
        "note": "string",
        "responder_id": "string"
      }
    ],
    "emergency_calls": [
      {
        "timestamp": "string",
        "recipient": "string",
        "status": "string"
      }
    ],
    "video_key": "string",
    "frame_keys": ["string"],
    "status": "string"
  }
}
```

---

## API Endpoints

### Video Handling
- **`POST /api/get-upload-url`**: Retrieve an S3 presigned URL for uploading videos.
- **`POST /api/process-video`**: Analyze the uploaded video and extract key frames.

### Incident Management
- **`POST /api/incidents`**: Create a new incident record.
- **`PUT /api/incidents/{id}/notes`**: Add responder notes to a specific incident.
- **`GET /api/incidents/{id}`**: Retrieve detailed information about a specific incident.

### Emergency Services
- **`POST /api/emergency-call`**: Initiate an automated emergency call.
- **`GET /api/map/services`**: Fetch nearby emergency service locations.

---

## Installation

### Prerequisites
- Node.js (for frontend)
- Python (for backend)
- AWS account with necessary services enabled
- Environment variables:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `DYNAMODB_TABLE_NAME`
  - `AWS_REGION`

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment:
   ```bash
   python -m venv env
   source env/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Emergency Response Dashboard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## Contributing

We welcome contributions! Please fork the repository and submit a pull request for any features, fixes, or enhancements.
