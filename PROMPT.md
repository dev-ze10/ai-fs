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