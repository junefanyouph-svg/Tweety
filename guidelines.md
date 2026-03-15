## Jargon Project Guidelines (Updated March 2026)

### Tech Stack & Architecture
- Frontend: React 19 + Vite 7 in `client/`.
- Backend: Node + Express 5 in `server/`.
- Data/Auth/Realtime: Supabase (Postgres, Auth, Realtime, Storage).
- Routing: `react-router-dom` with protected routes in `client/src/App.jsx`.
- UI styling: mixed approach
  - Tailwind utility classes (enabled via `@tailwindcss/vite`).
  - JS style modules in `client/src/styles/*.styles.js`.

### Current Project Structure
- `client/src/pages/`: route screens (`Feed.jsx`, `Profile.jsx`, `ChatPage.jsx`, etc.).
- `client/src/components/`: shared UI (`Layout`, `PostCard`, `Sidebar`, `BottomNav`, etc.).
- `client/src/utils/`: app utilities (`cache.js`, `profileCache.js`, `accountStore.js`, `interactionsChannel.js`).
- `client/src/supabase.js`: Supabase browser client (currently hardcoded URL + anon key).
- `server/index.js`: Express bootstrap and route mounting.
- `server/routes/`: domain routers (`posts`, `comments`, `likes`, `profiles`, `followers`, `notifications`, `settings`).
- `server/supabase.js`: service-role Supabase client from env vars.
- Root utility scripts (`fix*.js`, `add_*.js`, `inject_final.js`, `repair.js`) are one-off maintenance scripts.
- `client/public/`: static assets including PWA manifest (`manifest.json`), service worker (`sw.js`), and app icons.

### Environment & Configuration
- Server reads root `.env` via `require('dotenv').config({ path: '../.env' })`.
- Required server vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- API port is currently hardcoded to `3001` in `server/index.js`.
- Client API base URL is expected in `VITE_API_URL` (used across pages/components).

### Realtime Patterns
- Shared channel: `interactionsChannel` (`tweety-interactions`) for broadcast fallback events.
- Broadcast events:
  - `like`
  - `comment`
  - `comment_like`
- Browser-level sync events:
  - `tweety_global_like`
  - `tweety_global_comment`
  - `tweety_global_comment_like`
  - `tweety_profile_updated`
- Also listens to Postgres changes on `likes`, `comments`, `comment_likes`, and `profiles`.

### API Surface (Mounted Prefixes)
- `/posts`: feed, create, search, single post, delete.
- `/comments`: list by post, create, delete.
- `/likes`: list, like, unlike.
- `/profiles`: search, stats, availability check, get, upsert.
- `/followers`: followers, following, follow, unfollow.
- `/notifications`: list, create, mark read, delete.
- `/settings`: username/display name/email/password updates, account delete.

### Coding Conventions
- Keep existing file naming:
  - Components/pages: `PascalCase.jsx`.
  - Helpers/modules: `camelCase.js`.
  - Route files: lowercase plural domain names.
- Match local style in edited file (many files use 2-space indentation and semicolon-light style).
- Prefer explicit cleanup in `useEffect` for subscriptions/listeners.
- Use optimistic UI carefully and roll back on request failure.
- **Thread & Branching Patterns (New March 2026)**:
  - Expansion: Branches must expand one level at a time. Expanding a parent reveals only direct children; deep descendants remain hidden until manually toggled.
  - Reset: Collapsing a branch must recursively reset all descendant nodes to their default collapsed state in the internal state (`collapsedThreads`).
  - Global Reset: Closing the entire comment section must fully wipe all thread expansion states to start fresh on reopening.
  - Tree Lines: Vertical connector lines (stems) must terminate at the vertex/avatar of the last visible direct child. Use `ResizeObserver` + double `requestAnimationFrame` for accurate measurement after layout updates.
  - Style: Use `.children` class for reply containers and strictly scope selectors (e.g., `:scope > .children`) to maintain independent level visibility.

### Development Notes
- Frontend commands (`client/`): `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.
- Backend start (`server/`): `node index.js`.
- Backend test scripts in `server/` are manual diagnostics, not a full automated test suite.

### Mandatory Workflow Rule
- **Always git push**: Immediately after any commit, you MUST run `git push origin main` (or your current branch) to ensure the remote repository is in sync with the local environment. Never leave commits unpushed.
