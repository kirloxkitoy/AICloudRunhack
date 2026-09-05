# Gemini Journal & Voice Reflections

A secure, private, user-authenticated voice and text journaling web application powered by **Gemini 3.6 Flash**, **Firebase Authentication (Google Sign-In)**, and **Cloud Firestore** with strict per-user data isolation.

---

## Architecture Overview

```
                    ┌──────────────────────────────────────────────┐
                    │               Client (Browser)               │
                    │  - React 19 + TypeScript + Vite              │
                    │  - Tailwind CSS UI with Plus Jakarta Sans    │
                    │  - MediaRecorder Audio Capture               │
                    │  - Firebase Auth (Google Sign-In Popup)      │
                    └───────────────▲───────────────▲──────────────┘
                                    │               │
      Direct Firestore Reads/Writes │               │ Express API Calls
       (Enforced by Security Rules) │               │ (/api/transcribe,
                                    │               │  /api/summarize, /api/chat)
                                    ▼               ▼
                 ┌───────────────────────┐   ┌──────────────────────────────┐
                 │    Cloud Firestore    │   │      Express Backend         │
                 │ /users/{uid}/entries  │   │  - Resilient Model Fallback  │
                 │ /users/{uid}/interact │   │  - Google GenAI SDK          │
                 └───────────────────────┘   └──────────────▲───────────────┘
                                                            │
                                                            │ Server-Side Secret
                                                            ▼
                                             ┌──────────────────────────────┐
                                             │    Gemini 3.6 Flash API      │
                                             │ (Fallback Ladder: 3.6 Flash  │
                                             │  -> 3.1 Flash Lite -> Latest │
                                             │  -> 3.7 Flash)               │
                                             └──────────────────────────────┘
```

---

## Threat Model Summary (The 5 Threat Zones)

| Threat Zone | Identified Risks & Vectors | Countermeasures & Applied Mitigations |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Malicious audio streams, prompt injection in reflections, oversized payloads. | Strict MIME-type checking, 50MB express body ceiling, text sanitization before processing. |
| **2. Planning & Reasoning** | System instruction bypass attempting to reveal private system guidelines or bypass tone. | Rigid system instructions with explicit role boundaries, treating user transcripts as passive data. |
| **3. Tool Execution & APIs** | Exposure of `GEMINI_API_KEY` in client bundle, SSRF, API exhaustion. | API keys stored server-side only via Secret Manager/env vars. Reusable `generateContentWithFallback` ladder prevents 503/429 failures. |
| **4. Memory & State** | Cross-user data leakage in Firestore, unauthenticated access. | Owner-bound Firestore Security Rules (`request.auth.uid == userId`), strict undefined-stripping (`sanitizePayload`). |
| **5. Inter-System Communication** | Session hijacking, client credential leaks. | Passwordless federated Google Sign-In via Firebase Auth. No passwords stored or processed in application code. |

---

## Prerequisites & Environment Setup

### 1. Enable Required Google Cloud APIs

Ensure your GCP project has the required APIs enabled:

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com
```

### 2. Secret Manager Setup for `GEMINI_API_KEY`

Store your Gemini API key securely in Google Cloud Secret Manager:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Cloud Firestore Security Rules

Deploy the following `firestore.rules` file to enforce strict owner-bound isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data isolation: only the authenticated owner can read/write their documents
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy via Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

## Cloud Run Deployment Flow

### 1. Build and Deploy Container to Cloud Run

```bash
gcloud run deploy gemini-journal \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production"
```

### 2. Required Campaign Labeling

Apply the mandatory challenge verification label to your deployed Cloud Run service:

```bash
gcloud run services update gemini-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Start local full-stack development server on port 3000
npm run dev

# Run TypeScript lint verification
npm run lint

# Compile production bundle
npm run build
```

---

## Comprehensive Functional Stability & Test Walkthrough

Below are the step-by-step test scenarios covering every user interaction:

### Test Case 1: Landing Page & Google Authentication Flow
1. Open the application URL without an active session.
2. Verify the landing screen displays:
   - App title ("Gemini Journal") and "Strict User Data Isolation" badge.
   - Core value highlights (Voice Audio Logs, Pre-Save Synthesis, Firestore Isolation).
   - "Continue with Google" sign-in button.
3. Click "Continue with Google" (`#google-signin-btn`).
4. Complete the Google Auth popup with your test account.
5. Verify seamless redirect into the private dashboard with your profile avatar, display name, and email.

### Test Case 2: Time-Dependent Dynamic Greeting
1. Observe the top greeting banner (`#greeting-banner`):
   - Between 5:00 AM - 11:59 AM: "Good morning, {Name}." with amber sun badge.
   - Between 12:00 PM - 4:59 PM: "Good afternoon, {Name}." with sky sun badge.
   - Between 5:00 PM - 9:59 PM: "Good evening, {Name}." with indigo sunset badge.
   - Between 10:00 PM - 4:59 AM: "Good night, {Name}." with slate moon badge.
2. Verify live digital clock and date updates in real-time.

### Test Case 3: Audio Logging & Verbatim Gemini Transcription
1. Navigate to the "Voice Log" tab (`#nav-tab-voice`).
2. Click "Start Audio Log" (`#start-recording-btn`).
3. Allow browser microphone access when prompted.
4. Speak a reflection aloud (e.g., *"Today I finished my primary project milestones and felt a tremendous sense of accomplishment, though I need to remember to balance rest this weekend."*).
5. Watch the active recording timer and live waveform bars animate.
6. Click "Stop & Transcribe" (`#stop-recording-btn`).
7. Verify loading state displays: "Transcribing audio with Gemini..." &rarr; "Synthesizing reflection...".
8. Verify playback button allows listening back to the captured audio.

### Test Case 4: Gemini Summary Pre-Save Presentation
1. After transcription, verify the review card appears (`#summary-review-card`):
   - **Editable Title**: pre-populated with a concise title (e.g., *"Project Milestones & Weekend Balance"*).
   - **Detected Tone/Mood**: badge displays emotional tone (e.g., *"Reflective & Accomplished"*).
   - **Narrative Synthesis**: 2-3 sentence paragraph summarizing the spoken thoughts.
   - **Core Insights & Highlights**: bulleted list of extracted points.
   - **Verbatim Spoken Transcript**: full verbatim text with punctuation.
2. Modify the title input (`#entry-title-input`) to a custom title.
3. Click "Accept & Save to Journal" (`#accept-and-save-btn`).
4. Verify success banner appears and floating notification confirms the record is committed to Cloud Firestore.

### Test Case 5: Multi-Turn Reflection Dialogue with Gemini
1. Click the "Reflections" tab in the navbar (`#nav-tab-reflection`).
2. Verify guided prompt chips appear (e.g., *"What brought me an unexpected moment of calm or gratitude today?"*).
3. Click a guided prompt or type a custom reflection in `#reflection-chat-input`.
4. Click "Send" (`#send-reflection-btn`).
5. Observe Gemini's empathetic and supportive response bubble appear.
6. Submit a follow-up turn replying to Gemini's inquiry.
7. Click "Save to Journal" (`#save-reflection-btn`) at the top right of the chat.
8. Verify confirmation checkmark indicating the conversation thread is saved in Firestore.

### Test Case 6: Isolated History Exploration & Search
1. Click the "History" tab (`#nav-tab-history`).
2. Verify both the voice log entry and reflection entry are listed.
3. Test filter pills:
   - Click "Voice Logs": only voice entries appear.
   - Click "Reflections": only conversational reflection entries appear.
   - Click "All": all entries appear.
4. Type in the search box (`#history-search-input`):
   - Search for a keyword from your transcript or title.
   - Verify dynamic filtering.
5. Click on an entry card to open the detail modal (`#entry-detail-modal`).
6. Verify full synthesis, bullet points, and conversation turns are accurately rendered.
7. Click "Delete Entry" and confirm the prompt; verify the entry is permanently removed from the user's Firestore collection.

### Test Case 7: Sign Out Flow
1. Click the sign-out icon in the top right navbar (`#sign-out-btn`).
2. Verify the session terminates cleanly and the user is returned to the public landing page.
