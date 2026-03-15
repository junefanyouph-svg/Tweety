# Repository Guidelines

## Project Structure & Module Organization
This repo is split into `client/` (React + Vite frontend) and `server/` (Express API).
- `client/src/pages/`: route-level screens (for example `Feed.jsx`, `Profile.jsx`).
- `client/src/components/`: reusable UI pieces.
- `client/src/styles/`: page/component style modules.
- `client/src/utils/`: client-side helpers and realtime/cache utilities.
- `server/routes/`: API domains (`posts`, `likes`, `comments`, `profiles`, etc.).
- `server/index.js`: API entry point (`http://localhost:3001`).
- `client/public/`: static assets including PWA manifest, service worker, and app icons.
- Root `.env`: shared runtime configuration used by the server.

## Build, Test, and Development Commands
Run commands from each package directory.
- `cd client && npm install`: install frontend dependencies.
- `cd client && npm run dev`: start Vite dev server.
- `cd client && npm run build`: production build to `client/dist`.
- `cd client && npm run lint`: run ESLint for JS/JSX.
- `cd client && npm run preview`: preview the production build.
- `cd server && npm install`: install backend dependencies.
- `cd server && node index.js`: start Express API.
- `cd server && node test.js` (or `test-insert.js`): manual Supabase/realtime checks.

## Coding Style & Naming Conventions
- Use 2-space indentation and semicolon-free style to match existing source.
- React components/pages: `PascalCase` filenames (for example `PostCard.jsx`).
- Utilities and backend route modules: lowercase descriptive names (for example `profileCache.js`, `routes/posts.js`).
- Keep route handlers focused by domain; place shared client logic in `client/src/utils`.
- Linting is configured in `client/eslint.config.js` (ESLint 9 + React Hooks + React Refresh).
- **Comment Thread Implementation**:
  - Always enforce "one level at a time" expansion.
  - Recursive state reset is mandatory when collapsing any branch.
  - Measure thread lines dynamically after DOM paint (using double rAF) to ensure they stop at the last direct child only.
  - Avoid layout-affecting transitions (like `max-height` or `transform`) on collapsible wrappers as they interfere with accurate DOM measurement.

## Testing Guidelines
There is no formal unit-test framework configured yet.
- Minimum gate before PR: `npm run lint` in `client/` and manual API smoke checks.
- For backend changes, validate affected endpoints locally and run relevant scripts in `server/`.
- If adding automated tests, keep them near the affected module and document run commands in `package.json`.

## Commit & Pull Request Guidelines
Git history is unavailable in this workspace, so follow a consistent convention going forward.
- Commit format: `type(scope): short summary` (for example `feat(feed): add mention badge`).
- Keep commits atomic and focused by package (`client` or `server`).
- **Mandatory Push**: Always run `git push` immediately after committing changes to ensure the remote repository is updated.
- PRs should include: purpose, key changes, local verification steps, related issue, and UI screenshots for visual changes.
- Note any `.env` or schema requirements explicitly in the PR description.
