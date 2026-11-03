# TeamFlow — what changed

## Bugs fixed
- **Inviting a teammate no longer fails with a 500.** The invitation was being created twice (the second insert hit the unique token index *after* the email had already gone out).
- **Invitation emails are real now.** The HTML/plain-text template was a placeholder, and `verifyEmailConnection()` referenced undefined variables, so `npm run test:email` always crashed.
- **`/accept-invitation` page added** (the emailed link pointed at a route that didn't exist). Works for signed-out, signed-in, and brand-new users, and returns to the invite after login/sign-up.
- **Security:** listing a workspace's invitations had no membership check; now owner/admin only. Only the owner can invite admins.
- `dotenv` is now loaded before the app reads `CLIENT_URL` (CORS/sockets/invite links).
- Malformed JSON and bad IDs return 400 instead of 500.
- Client `npm run build` was failing (8 TypeScript errors); it type-checks cleanly now.
- Sidebar: stale-closure / race conditions fixed (rewritten). Sessions survive a page refresh, and an expired token signs you out instead of leaving a broken UI.

## New features
- Workspaces: create more than one.
- Members: owner can change roles; owners/admins can remove members; anyone (except the owner) can leave. Removed members' tasks become unassigned and they stop receiving live events.
- Invitations: revoke pending invites; clear success/error messages.
- Projects: rename and archive (admin or creator).
- Tasks: assignee, due date (overdue highlighting), delete (admin or creator), drag-and-drop between columns, live create/update/delete across browsers.
- Activity feed per task (created, status changes, assignments, edits, comments) and comment deletion.
- Basic in-memory rate limiting on login/register and invitations.

## Setup notes
- Copy `server/.env.example` -> `server/.env` and `client/.env.example` -> `client/.env` for new setups.
- `JWT_EXPIRES_IN` defaults to 1h if unset; the example uses 7d.
- `npm run test:email` (in `server/`) checks your SMTP login.
- Rate limiting is per server process. Set `TRUST_PROXY=1` when deployed behind a proxy.
- **Your original `server/.env` is included unchanged and contains real credentials (Gmail app password, MongoDB, JWT secret). Don't commit or share it; rotate them if it ever left your machine.**
