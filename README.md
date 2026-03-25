# M2i-LMS (Metrics to Internship Learning Management System)

M2i_LMS is an AI-powered learning and career development platform designed to bridge the gap between academic education and employment. It integrates structured learning, real-time mentorship, and a sophisticated metrics engine to track and quantify student growth.

## 📁 Repository Structure

- `backend/`: Node.js Express server, TypeScript, Prisma, and PostgreSQL.
- `frontend/`: Next.js App Router, TypeScript, and Tailwind CSS.
- `docs/`: Comprehensive project documentation.
  - `features/`: Detailed "Complete Implementation Guides" for each system module (F01-F10).
  - `flowchart/`: Visual diagrams of system processes and workflows.
  - `API_Endpoints.md`: Authoritative reference for all 87 API endpoints.
  - `Database_Schema.md`: Authoritative reference for the 20-table Prisma schema.
  - `M2i_LMS.md`: Master Product Documentation and vision.
  - `Developer_Onboarding_Guide.md`: Setup instructions for new developers.
  - `Testing_And_QA_Guide.md`: Test plans and quality assurance protocols.

## 🚀 Getting Started

Refer to the [Developer Onboarding Guide](docs/Developer_Onboarding_Guide.md) for detailed setup and installation instructions.

### Quick Start (Backend)
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Quick Start (Frontend)
```bash
cd frontend
npm install
npm run dev
```

## 📖 Key Documentation

- **Full Feature Specs:** [docs/features/](docs/features/)
- **API Reference:** [docs/API_Endpoints.md](docs/API_Endpoints.md)
- **Database Schema:** [docs/Database_Schema.md](docs/Database_Schema.md)
- **Architecture Overview:** [docs/M2i_LMS.md](docs/M2i_LMS.md)

---
*M2i_LMS — Version 1.0 | March 2026*
