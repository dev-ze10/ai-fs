# AI-FS — Email Campaign Manager

A full-stack email campaign management application built with Node.js, React, and PostgreSQL.

## Local Setup

### Prerequisites

- Docker & Docker Compose

### Start

```bash
cp .env.example .env
docker compose up --build -d
```

This starts three services:
- **postgres** on port 5432
- **backend** on port 3000 (hot-reload via tsx, auto-runs migrations on startup)
- **frontend** on port 5173 (Vite dev server)

### Create a Test User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","name":"Demo","password":"securepass123"}'
```

Then open http://localhost:5173 and login with `demo@example.com` / `securepass123`.

### Run Tests

```bash
docker compose exec backend npm test
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Register a new user |
| POST | /auth/login | No | Login, returns JWT |
| GET | /campaigns | Yes | List user's campaigns |
| POST | /campaigns | Yes | Create campaign (with optional recipient_emails) |
| GET | /campaigns/:id | Yes | Campaign detail + recipients |
| PATCH | /campaigns/:id | Yes | Update (draft only) |
| DELETE | /campaigns/:id | Yes | Delete (draft only) |
| POST | /campaigns/:id/schedule | Yes | Schedule (draft only, future date) |
| POST | /campaigns/:id/send | Yes | Send (random sent/failed per recipient) |
| GET | /campaigns/:id/stats | Yes | Stats (total, sent, failed, opened, rates) |
| GET | /recipients | Yes | List all recipients |
| POST | /recipients | Yes | Create a recipient |

## How I Used AI (Claude Code)

### Tasks Delegated to AI

I used Claude Code as a pair-programming assistant throughout this project. The tasks I delegated included:

- **Docker & infrastructure setup** — Generating docker-compose.yml, Dockerfiles for both services, and initial package.json/tsconfig.json configurations (Prompt 1)
- **Database schema via Knex migrations** — Creating the 4 migration files with UUIDs, foreign keys, indexes, PostgreSQL enums, and the `set_updated_at()` trigger function (Prompt 2)
- **Backend scaffolding** — Controllers, routes, middlewares, Zod validation, JWT auth, and the full campaign CRUD with business rules (Prompts 3–4)
- **Integration test suite** — 26 tests covering auth, authorization, validation, status restrictions, and stats calculation (Prompts 6–7)
- **Frontend architecture** — React Router setup, Zustand store, Axios interceptors, React Query hooks, and all 4 page components with Tailwind styling (Prompts 8–9)

### Example Prompts Used

**Strict business rules for campaigns (Prompt 4):**
> "PATCH and DELETE must explicitly check the DB and throw an error/400 if the campaign status is NOT 'draft'. The send endpoint must lock the status; once 'sent', it cannot be undone."

This prompt established the core invariant that sent campaigns are immutable — Claude implemented the status checks in every relevant controller.

**Recipient email validation with custom Zod refinement (Prompt 9):**
> "For recipient_emails, use a textarea where the user can paste comma or newline-separated emails. Write a custom Zod refinement to split the string into an array, trim whitespace, and validate that every item is a valid email format. Show an inline error (e.g., 'Invalid email found: abc@.com') if any fail."

This produced the `.refine()` chain in CampaignNew.tsx that parses and validates each email individually.

### Where the AI Needed Correction

**Prompt 5 — Missing route parameter validation:** Claude's initial campaign controller accessed `req.params.id` without validating it was a valid UUID first. I had to explicitly ask it to add a `paramsSchema` with `z.string().uuid()` and apply it to all 6 handler functions before any database query.

**Prompt 7 — Random send simulation:** Claude initially implemented the send endpoint as a bulk update (`UPDATE campaign_recipients SET status = 'sent'`). I corrected this and asked it to loop through each recipient individually, using `Math.random()` to randomly assign `'sent'` or `'failed'` status — simulating a realistic async sending process. In the same prompt, I also guided Claude to update the `create` function to accept `recipient_emails`, look up or create each recipient, and insert the join table rows.

### What I Strictly Controlled

The **architectural decisions around business rules** were mine — Claude did not decide these on its own:

- The invariant that sent/scheduled campaigns cannot be edited or deleted (400 response)
- That scheduling requires a future timestamp validated at both backend (Zod) and frontend (modal validation)
- That sending is irreversible with a confirmation modal on the frontend
- The ownership model where users can only access their own campaigns (every query filters by `created_by`)
- The consistent response shape (`{ success, data, error }`) across all campaign endpoints

Claude implemented these rules, but the specification of what should and shouldn't be allowed came from my prompts.
