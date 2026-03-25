# M2i_LMS Backend

The backend API server for the M2i_LMS (Learning Management System) platform. Built with Node.js, Express, and TypeScript, using Prisma as the ORM and PostgreSQL as the primary database.

## 🚀 Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4
- **Language**: TypeScript 5
- **Database**: PostgreSQL 15+ (via Prisma 5 ORM)
- **Caching & Queues**: Redis 7 + Bull
- **Authentication**: JWT (Access + Refresh tokens), bcryptjs
- **Validation**: Joi
- **Real-time**: Socket.io
- **AI Integration**: Ollama (Mistral 7B) for Quiz Generation, Whisper for Transcription
- **Documentation**: Swagger (OpenAPI 3.0)
- **Logging**: Winston + Morgan

## 📁 Project Structure

```text
src/
├── controllers/    # Thin request/response handlers
├── services/       # All business logic & database interactions
├── middleware/     # Auth, RBAC, Validation, Error Handling
├── routes/         # Express route definitions
├── validators/     # Joi schema definitions
├── lib/            # Shared libraries (Prisma client, etc.)
├── queues/         # Bull queue definitions & processors
├── sockets/        # Socket.io event handlers
├── scheduler/      # node-cron job scheduler
├── app.ts          # Express app configuration
└── server.ts       # HTTP server & Socket.io entry point
```

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js**: v20 or higher
- **PostgreSQL**: v15 or higher
- **Redis**: v7 or higher
- **Ollama**: (Optional, for AI features) Installed and running locally

### 2. Installation
```bash
# Clone the repository (if you haven't)
# cd backend

# Install dependencies
npm install
```

### 3. Configuration
Copy the example environment file and fill in your local values:
```bash
cp .env.example .env
```
Key variables to set:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `REDIS_HOST` & `REDIS_PORT`: Your Redis connection details.
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Random 64-character strings.

### 4. Database Setup
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# Seed the database with initial roles and admin user
npm run prisma db seed
```

### 5. Running the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production build
npm run build
npm start
```

## 🔐 Seed Credentials
For development, you can use these default accounts after running the seed script (Password for all: `ChangeMe123!`):
- **Admin**: `admin@dev.com`
- **Mentor**: `mentor@dev.com`
- **Student**: `student1@dev.com` (to `student5@dev.com`)

## 📖 API Documentation
Once the server is running, you can access the interactive Swagger documentation at:
`http://localhost:3001/api-docs`

## 🧪 Scripts
- `npm run lint`: Run ESLint check
- `npm run format`: Format code with Prettier
- `npm run test`: Run Jest tests
- `npm run job:metrics`: Manually trigger the metrics aggregation job

## 📄 License
This project is proprietary and confidential.
