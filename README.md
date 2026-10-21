# LexiLearn Backend

LexiLearn is an educational platform designed to support students with dyslexia through interactive and adaptive learning exercises. This backend is developed using **NestJS**, **TypeScript**, and **PostgreSQL** with **Prisma ORM**.

## Current Development Phase
This backend represents the foundation of the project. It includes:
- User & Student management (with basic JWT authentication)
- Skills and Exercises tracking
- Attempt evaluation and basic adaptive learning logic
- REST API documented via Swagger

## Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL
- npm or yarn

## Setup Instructions

1. **Clone & Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Database Configuration**
   Copy `.env.example` to `.env` and update the `DATABASE_URL` to point to your local PostgreSQL instance:
   ```bash
   cp .env.example .env
   ```

3. **Initialize Database**
   Run the following commands to create the tables and seed initial data:
   ```bash
   npx prisma db push
   npx prisma generate
   npx ts-node prisma/seed.ts
   ```
   *(Note: You can add `"seed": "ts-node prisma/seed.ts"` to `package.json` for easier seeding).*

4. **Start the Application**
   ```bash
   # development
   npm run start

   # watch mode
   npm run start:dev
   ```

## API Documentation
Once the server is running (default `http://localhost:3000`), you can access the Swagger UI documentation at:
**[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

## Adaptive Learning Logic (Basic)
Currently, a simplified adaptive logic is implemented in the `AttemptsService`:
- Submitting an exercise increases proficiency if correct, based on the exercise difficulty.
- Decreases if incorrect.
- If proficiency falls below 80, the skill is flagged as `needsPractice: true`.

*Future phases will expand this with advanced ML models.*
