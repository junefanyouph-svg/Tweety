# Jargon

A sleek, modern, and highly interactive social media platform built for speed and real-time engagement.

## 🚀 Overview

Jargon is a full-stack social media application designed to provide a premium user experience. It features a responsive design, real-time updates via Supabase, and advanced threading capabilities for deep conversations.

### Key Features

- **Real-time Feed**: Instant updates for posts and interactions.
- **Advanced Threading**: Deeply nested comment threads with intelligent expansion and layout logic.
- **Real-time Interactions**: Likes, comments, and notifications update instantly without page refreshes.
- **Mobile First & PWA**: Fully installable as a standalone web app on iOS and Android for a native-like, full-screen experience.
- **Dark/Light Modes**: Beautifully crafted themes for any environment.
- **Secure Authentication**: Robust auth system powered by Supabase.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS (v4).
- **Backend**: Node.js, Express 5.
- **Database & Realtime**: Supabase (Postgres, Realtime, Auth, Storage).
- **Styling**: Vanilla CSS + Tailwind utility classes.

## 📱 Mobile Installation (PWA)

Jargon is a Progressive Web App. To enjoy the full-screen experience:
- **iOS Safari**: Tap the **Share** button (□↑) → **"Add to Home Screen"**.
- **Android Chrome**: Tap the **⋮ menu** → **"Install App"**.

## 💻 Local Development

1. **Setup**: Run `npm install` in both `client/` and `server/` directories.
2. **Environment**: Configure the root `.env` with your Supabase credentials.
3. **Execution**:
   - Client: `cd client && npm run dev`
   - Server: `cd server && node index.js`
