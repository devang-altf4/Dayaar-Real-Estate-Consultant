# Dayaar Real Estate Sales CRM

> High-Throughput B2B Real Estate Sales CRM with Company Android Calling Bridge, Secret QA Lead Verification, Geofenced Attendance, and 300-Calls/Day Workflow Automation.

---

## Architecture Highlights
- **Company Android Calling Gateway**: Eliminates double-leg cloud PSTN calling fees by commanding company-issued Android phones with unlimited cellular SIMs via WebSockets/FCM.
- **300 Leads/Day High-Throughput Engine**: Prioritized daily call queue, automatic next-lead progression, quick one-click dispositions, and real-time velocity tracking.
- **Strict 4-Attempt Business Rule**: Automatically transitions leads to `NOT_PICKED_UP` upon 4 genuine customer-side failures, preserving attempt counts on device/network errors.
- **Secret Lead QA Verification**: Non-mutating secondary verification with API-level projection sanitization and automated disposition mismatch detection.
- **Server-Side Geofenced Attendance**: Haversine distance and GPS precision verification against configured office coordinates.
- **Development Android Calling Simulator**: Built-in test simulator at `/dev/device-simulator` allowing full end-to-end testing without physical hardware.

---

## Monorepo Layout
```
CRM/
├── apps/
│   ├── api/        # NestJS REST + Socket.IO Backend (Port 4000)
│   └── web/        # Next.js 14+ App Router Frontend (Port 3000)
├── packages/
│   ├── shared/     # Shared DTOs, Enums, Types & Haversine Utilities
│   └── config/     # Monorepo Tailwind, ESLint & TypeScript configs
└── docs/           # System, Telephony, QA and Database Architecture
```

---

## Quick Start & Setup

### Prerequisites
- Node.js 18+ (v22.x recommended)
- pnpm (`npm install -g pnpm`)
- MongoDB (Local MongoDB or MongoDB Atlas URI)

### 1. Installation
```bash
# In the root workspace
pnpm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `MONGODB_URI` is pointing to your MongoDB instance (local or MongoDB Atlas).

### 3. Database Seeding
Populate realistic seed data (1 Organization, 1 Admin, 2 Managers, 8 Employees, 50+ Real Estate Leads, Call Logs, Verification Mismatch, Attendance, Follow-ups):
```bash
pnpm seed
```

### 4. Running the Development Servers
```bash
# Run both API and Web concurrently
pnpm dev

# Or run separately:
pnpm dev:api    # Starts NestJS on http://localhost:4000
pnpm dev:web    # Starts Next.js on http://localhost:3000
```

---

## Default Demo Credentials

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Rajesh Sharma (Director) | `admin@dayaar.com` | `Password@123` |
| **Manager** | Amit Verma (Sales Manager A) | `manager.amit@dayaar.com` | `Password@123` |
| **Manager** | Priya Nair (Sales Manager B) | `manager.priya@dayaar.com` | `Password@123` |
| **Employee** | Rahul Kapoor (Senior Caller) | `rahul.k@dayaar.com` | `Password@123` |
| **Employee** | Sneha Patel (Telecaller) | `sneha.p@dayaar.com` | `Password@123` |
| **Employee** | Vikram Singh (Telecaller) | `vikram.s@dayaar.com` | `Password@123` |
| **Employee** | Ananya Joshi (Telecaller) | `ananya.j@dayaar.com` | `Password@123` |
| **Employee** | Rohit Mehta (Telecaller) | `rohit.m@dayaar.com` | `Password@123` |

---

## Testing the End-to-End Android Calling Workflow
1. Log in as an Employee (e.g. `rahul.k@dayaar.com`).
2. Notice the global top-bar shows: `📱 No Calling Device Connected`.
3. Open `/devices` and click **Pair Android Device** to generate a 6-digit PIN.
4. In another tab, open the **Development Device Simulator** at `/dev/device-simulator`.
5. Select Rahul Kapoor or enter the 6-digit PIN and click **Connect Simulator**.
6. The CRM instantly updates in real-time to `● Online - Samsung Galaxy A15 (SIM Ready)`.
7. Navigate to any assigned lead or `/queue` and click **[ CALL ]**.
8. The Simulator immediately receives the `CallCommand` and simulates dialing, connecting, call duration, and audio upload.
9. Lead history, attempt counters, and the recording player update automatically!

---

## Testing & Quality Assurance
```bash
# Run all unit and integration tests
pnpm test

# Run linter across all packages
pnpm lint

# Build full production bundles
pnpm build
```
