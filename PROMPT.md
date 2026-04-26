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


---
## Prompt 9
Act as an expert React developer. Now, generate the frontend pages and components using React 18, TypeScript, Vite, and Tailwind CSS. We will use react-hook-form combined with zod for strict client-side validation, and react-hot-toast (or sonner) for global error/success notifications.

Please generate the code with a clean structure (src/pages, src/components/ui, src/hooks, src/api).

1. Core Setup & Error Handling:

Set up an Axios instance with interceptors. If an API returns 401, automatically clear the Zustand auth store and redirect to /login.

Ensure all API calls have proper try/catch blocks. Extract the error message from the backend response (err.response?.data?.error or details) and display it using toast notifications.

2. Page: /login

Create a Zod schema (valid email, password min 6 chars).

Use react-hook-form. Display inline red text errors below inputs if validation fails.

Disable the submit button and show a spinner while submitting. On success, store the JWT in Zustand and redirect to /campaigns. Show a toast error if credentials fail.

3. Page: /campaigns (List)

Fetch data using React Query (useQuery).

Display a robust Skeleton Loader while isLoading is true. Include an "Empty State" UI if there are no campaigns.

Render a clean table or card list. Implement a Status Badge component (Draft = Gray, Scheduled = Blue, Sending = Yellow, Sent = Green).

4. Page: /campaigns/new (Creation with strict Recipient parsing)

Define a Zod schema matching the backend: name, subject, body, and recipient_emails.

For recipient_emails, use a textarea where the user can paste comma or newline-separated emails. Write a custom Zod refinement or a transformation function before submission to:
a) Split the string into an array of strings.
b) Trim whitespace.
c) Validate that every item in the array is a valid email format. Show an inline error (e.g., "Invalid email found: abc@.com") if any fail.

On successful creation, show a success toast and navigate to the new campaign's detail page.

5. Page: /campaigns/:id (Detail & Actions)

Fetch campaign details and stats via React Query. Handle 404 gracefully (show "Campaign not found" and a back button).

Stats Section: Display open_rate and send_rate using Tailwind-styled progress bars 
Recipients Table: List the recipients, their individual status (pending/sent/failed), and opened time.

Action Buttons (Strictly conditional):

Schedule: Only show if status is 'draft'. When clicked, open a small modal with a datetime-local input. Validate that the selected time is in the future before calling the API.

Send: Only show if status is 'draft'. Add a JS confirm() or a confirmation modal ("Are you sure? This cannot be undone.") before calling the API.

Delete: Only show if 'draft'.

After any successful action (Schedule, Send, Delete), use React Query's queryClient.invalidateQueries to refresh the data automatically and show a success toast.