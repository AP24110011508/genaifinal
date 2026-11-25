# CabinVision AI – Sketch-to-Photorealistic Cabin Renderer

## 1. Project Introduction
**CabinVision AI** transforms hand-drawn architectural cabin sketches into photorealistic visualizations using Cloudflare Workers AI and the FLUX.2 Klein image model.

---

## 2. Technology Stack

### Frontend
- **Framework:** React.js (v19)
- **Build Tool & Dev Server:** Vite
- **Styling:** Tailwind CSS v4
- **HTTP Client:** Axios (configured with environment variable `VITE_API_BASE_URL`)
- **Iconography:** Lucide React

### Backend
- **Language & Runtime:** Python 3.13+
- **Web Framework:** Flask & Flask-CORS
- **Generative AI:** Cloudflare Workers AI REST API
- **Default Image Model:** `@cf/black-forest-labs/flux-2-klein-4b` (configurable via `CLOUDFLARE_IMAGE_MODEL`)
- **Computer Vision & Processing:** OpenCV (`opencv-python`), Pillow (`PIL`)
- **Environment & Security:** `python-dotenv`, Werkzeug

---

## 3. Architecture & Integration (Stage 5)

The application connects the React frontend directly to the Flask API backend:

```
┌─────────────────────────────────┐           ┌──────────────────────────────────┐
│   React Frontend (Port 5173)    │           │     Flask Backend (Port 5001)    │
│  ───────────────────────────────│           │  ──────────────────────────────  │
│  - SketchUpload (Drag & Drop)   │─Upload───>│  - POST /api/upload (OpenCV)     │
│  - CustomizationStudio (State)  │           │  - Storage (uploads/)            │
│  - GenerateButton (Loader state)│─Generate─>│  - POST /api/generate (Cloudflare)│
│  - ResultsComparison (Side-Side)│<─ImgURL───│  - GET /api/generated/<id>       │
└─────────────────────────────────┘           └──────────────────────────────────┘
```

1. **Upload:** User drops or browses a sketch (`.jpg`, `.jpeg`, `.png` under 10 MB). The frontend validates format/size locally and uploads it via `POST /api/upload`, receiving an `image_id`.
2. **Customization:** User selects cabin style, materials, lighting, and inputs custom architectural details.
3. **Generation:** When user clicks **Generate Cabin Visualization**, the frontend submits parameters to `POST /api/generate`, displaying a responsive loader and disabling duplicate clicks.
4. **Image Synthesis:** The Flask backend sends a square sketch and synthesized architectural prompt to FLUX.2 Klein through Cloudflare Workers AI. The returned image is validated, converted to PNG, and saved in `generated/` using the existing image URL and download format.
5. **Results:** The frontend renders the original sketch alongside the photorealistic visualization in a dual-pane comparison with one-click full-resolution **Download** and **Generate Again** actions.

---

## 4. Setup & Running the Application

### Backend Setup (Port 5001)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   # or: cd CabinVision-AI/backend
   ```

2. **Activate the virtual environment:**
   - **macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```
   - **Windows:**
     ```cmd
     venv\Scripts\activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Set your Cloudflare account ID and API token in `backend/.env`:
   ```env
   CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
   CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
   CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-2-klein-4b
   PORT=5001
   HOST=127.0.0.1
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
   FLASK_ENV=development
   ```

5. **Start the Flask server:**
   ```bash
   python app.py
   ```
   *Backend runs on `http://127.0.0.1:5001`.*

6. **Run Backend Tests (provider calls are mocked):**
   ```bash
   python -m unittest discover -s tests -v
   ```

---

### Frontend Setup (Port 5173)

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   # or: cd CabinVision-AI/frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:5001
   ```

4. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   *Frontend launches on `http://localhost:5173`.*

---

## 5. End-to-End Workflow & Testing Steps

1. **Open Frontend:** Navigate to `http://localhost:5173` in your web browser.
2. **Check Backend Status:** Notice the **Backend Online** indicator in the Studio header confirming active connection to `http://localhost:5001`.
3. **Upload Sketch:**
   - Drag and drop your cabin sketch (JPG or PNG) or click **"Or load sample Nordic A-Frame sketch"** for instant testing.
   - The sketch preview renders with file metadata and an **"Uploaded & Synced"** badge.
4. **Select Architectural Options:**
   - Style: *Modern*, *Rustic*, *Minimalist*, *Luxury*, or *Scandinavian*.
   - Materials: *Wood*, *Stone*, *Glass*, *Concrete*, or *Mixed*.
   - Lighting: *Daylight*, *Warm*, *Sunset*, or *Night*.
   - Prompt: Enter custom notes (e.g., *"Nestled by a glacial alpine lake, wrap-around cedar deck"*).
5. **Generate:**
   - Click **Generate Cabin Visualization**.
   - The button shows an animated Cloudflare synthesis status and locks against duplicate submissions.
6. **Compare & Download:**
   - On completion, the UI automatically transitions to the **Results Comparison** view.
   - Inspect the side-by-side view (Original Sketch vs. Photorealistic Rendering).
   - Click **Download Rendering** to save the generated visualization to disk.
   - Click **Generate Again** or **Back to Customization** to modify parameters and iterate.

---

## 6. Error Handling & Resilience

- **Backend Offline:** If Flask is not running, the UI displays a non-crashing banner: *"Cannot connect to the Flask backend server at http://localhost:5001. Please ensure the backend server is running."*
- **Cloudflare Credentials Missing or Invalid:** Directs the user to configure `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `backend/.env`; credentials are never returned by the API.
- **Quota or Rate Limited:** Distinguishes exhausted daily Neuron allocation from temporary rate limits and provides the daily reset time.
- **Model Access / Request Errors:** Returns provider error type, code, and request ID so model permissions and invalid parameters can be diagnosed without exposing API credentials.
- **Invalid Formats / Oversized:** Enforces the 10 MB limit and allowed extensions (`.jpg`, `.jpeg`, `.png`) on both client and server.
- **Generation Timeout:** Limits provider requests to four minutes and reports an actionable timeout.

---

## 7. Official Documentation References

- [Cloudflare Workers AI pricing and free daily allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare FLUX.2 Klein 4B model](https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/)
- [Cloudflare Workers AI REST API setup](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)
- [Cloudflare Workers AI model execution API](https://developers.cloudflare.com/api/resources/ai/methods/run/)
- [Flask-CORS Documentation](https://flask-cors.readthedocs.io/)

Workers AI includes a free allocation of 10,000 Neurons per day across the account. Image requests consume Neurons based on input and output image tiles; the allowance is limited and resets at 00:00 UTC. Check current usage and pricing before submitting high-resolution or repeated requests.
