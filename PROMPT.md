## Prompt 1: Foundation Setup

Act as an expert full-stack developer. We are building a monolithic repository with a Node.js backend and a React frontend. Both must use TypeScript.

Please generate the following foundation:
A docker-compose.yml file that provisions three services:
postgres (PostgreSQL 18)
backend (Node.js app)
frontend (React app)
Please use with the latest version

A Dockerfile for the backend (using a lightweight Node image, enabling TypeScript compilation).
A Dockerfile for the frontend (using Vite + React + TypeScript, multi-stage build serving with Nginx or just a dev server for now).

The initial package.json and tsconfig.json for the backend. Include dependencies for Express, pg (node-postgres), knex (for migrations/query building only - absolutely NO Prisma or TypeORM), zod, jsonwebtoken, and their respective types.

---

## Prompt 2: Database Schema Implementation

Now, let's implement the database schema for the backend using Knex.js migrations. Create the migration files for the following tables. Ensure exact column types, foreign key constraints, and timestamps.

users: id (UUID), email (unique), name, password_hash
campaigns: id (UUID), name, subject, body, status (draft/scheduled/sent), scheduled_at, created_by (FK to users)
recipients: id (UUID), email (unique), name
campaign_recipients: join table for campaigns/recipients with status (pending/sent/failed), sent_at, opened_at

Requirements for Inference:
Use PostgreSQL best practices (UUIDs for PKs, Timestamps, and Foreign Key constraints).
Add Indexes where they make sense for performance (filtering campaigns by user or checking delivery status).
Set up the knexfile.ts to use environment variables for Docker connectivity.
Include a way to handle updated_at automatically.

---
## Prompt 3: Backend Authentication & Middleware

Continuing with the current context, let's build the backend core. Please generate the code using a clean folder structure (e.g., src/controllers, src/routes, src/middlewares, src/db.ts).
Database Instance: Create a central src/db.ts that initializes and exports the Knex instance using the config from Step 2.
Server Setup: Create the main Express server entry point (src/index.ts) with basic security/parsing middlewares and centralized error handling.

Authentication Middleware:
Create a JWT middleware to verify the token.
Extend the Express Request type globally so we can safely attach the user (id) to the request object without TypeScript errors.

Auth Module (Zod & Controllers):
Define Zod schemas for the registration and login payloads.
Create the Auth Controller (POST /auth/register, POST /auth/login).
Instead of a generic middleware, parse and validate req.body directly inside the controller methods using the Zod schemas (e.g., schema.parse() or schema.safeParse()), catching and returning any validation errors.
Use bcrypt for password hashing and the exported Knex instance to insert/query the users table. Return a JWT on successful login/registration.
Connect these controllers to an Auth router.

--- 
## Prompt 4: 
Now, implement the Campaign routes and controllers. Ensure these are protected by the JWT middleware. Use Knex or raw SQL for queries.

Endpoints:

- GET /campaigns (List campaigns for the logged-in user)
- POST /campaigns (Create a campaign, default status 'draft')
- GET /recipient (Get Recipients)
- POST /recipient (Create recipient)
- GET /campaigns/:id (Return campaign details + list of associated recipients)
- PATCH /campaigns/:id (Update campaign)
- DELETE /campaigns/:id (Delete campaign)
- POST /campaigns/:id/schedule (Set scheduled_at)
- POST /campaigns/:id/send (Simulate sending: update campaign status to 'sent', mark recipients as 'sent', record sent_at)
- GET /campaigns/:id/stats (Calculate and return: total, sent, failed, opened, open_rate, send_rate)

CRITICAL Server-Side Business Rules to enforce in the controllers:
- Validation: Continue using Zod directly inside the controllers to validate req.body for the POST, PATCH, and Schedule endpoints.
- PATCH and DELETE must explicitly check the DB and throw an error/400 if the campaign status is NOT 'draft'.
- Scheduling: For the schedule endpoint, scheduled_at must be validated (via Zod or logic) to be a future timestamp. The send endpoint must lock the status; once 'sent', it cannot be undone.
- Consistency: Ensure all API responses follow a consistent JSON shape (e.g., { success: boolean, data?: any, error?: string }) with proper HTTP status codes.

---
## Prompt 5
Please implement Zod validation for route parameters in the campaign controller. Create a reusable params schema to validate the campaign ID, and update all 6 functions (show, update, remove, schedule, send, stats) to use this validation. Make sure the validation happens before the database query and returns a 400 error for invalid IDs.

---
## Prompt 6
Write at least 3 meaningful integration tests using jest, ts-jest, and supertest for the Node.js backend. Focus strictly on the critical business logic we just implemented.

Test Scenarios:

- Test that a campaign CANNOT be edited (PATCH) if its status is 'sent' or 'scheduled' (Expect 400).

- Test that scheduling a campaign (POST /schedule) with a past timestamp fails validation (Expect 400).

- Test the /stats endpoint to ensure open_rate and send_rate are calculated correctly based on mock/seeded campaign_recipients data.

---
## Prompt 7
Review the send and create functions in the campaign controller.

In the send function, update the logic to satisfy this requirement: "Simulate asynchronous sending process, recipient can be marked as sent or failed randomly". Instead of a bulk update to 'sent', loop through the campaign_recipients, use Math.random() to determine 'sent' or 'failed' for each, and update them accordingly.

In the create function, update the createSchema to accept an array of recipient_emails. Inside the controller, after inserting the campaign, loop through these emails. If an email exists in the recipients table, use its ID; if not, create it. Then, insert all these IDs into the campaign_recipients table with status 'pending'.

Expand the test suite with more comprehensive coverage. Add tests for authentication (401s), authorization (users can't access others' campaigns), validation errors, edge cases (404s, invalid IDs), and workflow constraints. Aim for at least 10-12 test cases total covering happy paths, errors, and security.

---
## Prompt 8
Now, let's move to the frontend part of the monorepo. We are using React 18, TypeScript, and Vite.
Please generate the setup for state management and data fetching.

Set up Axios with an interceptor to automatically attach the JWT token from localStorage/cookies to all requests.

Create a Zustand store to handle user authentication state (login, logout, setToken, user info).

Set up React Query (TanStack Query) provider in the main App.tsx.
Also, provide the code for a basic App Router using react-router-dom with the following routes: /login, /campaigns, /campaigns/new, /campaigns/:id. Protect the campaign routes so they redirect to /login if unauthenticated