# AI Agent Instructions & Context

Welcome, Agent. You are operating within a **Progressive Web App (PWA)** codebase designed to be a lightweight, mobile-first food tracking application. 

Your goal is to help maintain, scale, and optimize this application while ensuring it remains fast, offline-capable, and exceptionally user-friendly on mobile screens.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** Vanilla HTML5, CSS3 (Mobile-First, flexbox/grid), and modern ES6+ JavaScript.
- **State & Storage:** Local-only using `localStorage`. No external heavy databases unless explicitly requested.
- **PWA Features:** - `manifest.json` for app configuration and standalone display mode.
  - `sw.js` (Service Worker) handling caching for **offline-first** availability.

---

## 🤖 Core Directives & Guardrails

When writing code, refactoring, or adding features, you **must** adhere to the following rules:

### 1. Maintain the Offline-First Pattern
- Any new features that require data persistence must hook into the existing local storage synchronization layer.
- If you modify assets (HTML, CSS, JS, or icons), you **must update the cache version string** in `sw.js` to trigger a background update for the user.

### 2. Mobile-First UI/UX Strictness
- Assume all users are accessing this via a touchscreen on a smartphone.
- Tap targets (buttons, list items) must be at least `48px x 48px` with adequate spacing.
- Avoid hover-dependent logic or UI elements that do not translate to touch devices.
- Prevent layout shifts (CLS) when items are dynamically added to the timeline.

### 3. Keep it Lightweight
- Avoid importing heavy third-party npm packages or frameworks (like React, Vue, or Tailwind) unless explicitly instructed by the user. 
- Use native browser APIs wherever possible.

---

## 💻 Common Commands & Workflow

Use these commands within the terminal environment to test, validate, and deploy the application:

```bash
# To test locally (accessible from your phone on the same network)
./serve.sh

# Optionally set a custom port
PORT=3000 ./serve.sh

