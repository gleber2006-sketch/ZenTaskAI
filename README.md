# ⚡ ZenTask Pro | Unified AI Workspace

ZenTask Pro is an enterprise-grade task management system designed for high-performance individuals. It combines deep work focus, strategic task grouping, and artificial intelligence to streamline execution.

## 🚀 Key Features

- **🧘 Focus Mode (Deep Work)**: Distraction-free environment with primary objective elevation.
- **🎯 Strategic Grouping**: Automatic organization of tasks into Goals, Routines, Events, and Execution.
- **🤖 Zen Assistant**: AI-powered task processing and financial workflow integration via Google Gemini.
- **📱 PWA Ready**: Installable on mobile and desktop for a native experience with offline support.
- **🌓 Corporate UI**: Sleek, high-contrast Dark and Light modes.

## 🛠️ Technology Stack (Zero-Cost Architecture)

ZenTask Pro is built for **maximum efficiency at zero hosting cost**, utilizing free-tier production services:

- **Frontend**: Vite + React + Tailwind CSS.
- **Database/Auth**: Firebase Firestore (NoSQL) & Firebase Auth (Spark/Free Plan).
- **Intelligence**: Google Gemini API (Free Tier).
- **Offline**: Service Workers + Firestore Offline Persistence.

## 💻 Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create or edit `.env` and add:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_key_here
   ```

3. **Firebase Configuration**:
   Update `services/firebase.ts` with your credentials from the [Firebase Console](https://console.firebase.google.com/).

4. **Launch**:
   ```bash
   npm run dev
   ```

## 📱 PWA Installation
1. Access the app via Chrome or Safari.
2. Click the share icon or menu button.
3. Select **"Add to Home Screen"**.
4. Enjoy a native app experience!

---
*ZenTask Pro: Work Smarter, Not Harder.*
