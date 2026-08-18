# System Architecture - Dayaar Real Estate Sales CRM

## Overview
Dayaar Real Estate Sales CRM is a high-throughput, enterprise-grade multi-tenant platform designed to support high-velocity real estate telecalling operations (30-50+ agents handling ~300 leads/day/caller).

The platform decouples Web CRM business workflows from telephony execution by utilizing company-issued Android devices as cellular calling gateways. This completely avoids exorbitant PSTN double-leg cloud telephony costs while preserving end-to-end call tracking, automatic recording synchronization, and tamper-proof audit trails.

---

## High-Level Topology

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|                                                                                   |
|  +------------------------------+             +--------------------------------+  |
|  |     Next.js Web CRM App      |             |  Android Calling Gateway (P2)  |  |
|  |  (Agents, Managers, Admins)  |             |  (Company SIM / Foreground Svc)|  |
|  +--------------+---------------+             +---------------+----------------+  |
|                 |                                             |                   |
|                 | HTTPS / WSS                                 | HTTPS / WSS       |
+-----------------|---------------------------------------------|-------------------+
                  v                                             v
+-----------------------------------------------------------------------------------+
|                              BACKEND / API TIER                                   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                          NestJS Modular Core Server                         |  |
|  |                                                                             |  |
|  |  [ Auth & RBAC ]        [ Leads & Queue Engine ]    [ Devices & Presence ]  |  |
|  |  [ Calling Service ]    [ Secret Lead QA QA ]       [ Attendance Geofence ] |  |
|  |  [ Analytics 300 ]      [ Audit Logger ]            [ Storage Provider ]    |  |
|  |                                                                             |  |
|  |                      +-------------------------------+                      |  |
|  |                      | Socket.IO Realtime Dispatcher |                      |  |
|  |                      +-------------------------------+                      |  |
|  +-------------------------------------+---------------------------------------+  |
+----------------------------------------|------------------------------------------+
                                         v
+-----------------------------------------------------------------------------------+
|                               DATA & STORAGE TIER                                 |
|                                                                                   |
|  +--------------------------------------+   +----------------------------------+  |
|  |      MongoDB / MongoDB Atlas         |   |    Private Object Storage        |  |
|  |  (Organizations, Users, Leads,       |   | (Local Dev Path / AWS S3 / R2)   |  |
|  |   CallAttempts, Devices, Audits...)  |   | (Private Binary Audio Files)     |  |
|  +--------------------------------------+   +----------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## Core Subsystems

### 1. High-Throughput Calling Subsystem
- **300 Leads/Day/Caller**: Prioritized daily call queue, automatic next-lead progression, quick one-click dispositions.
- **Calling Provider Abstraction**: `CallingProvider` interface decoupling telephony driver from lead state machines.
- **SIM Readiness & Device Capabilities**: Real-time heartbeat validation ensuring the paired Android device is online, capable of placing calls, and has an active SIM card.
- **4-Attempt Business Rule**: Genuine customer-side unsuccessful attempts (e.g. `NOT_CONNECTED`, `BUSY`, `NO_ANSWER`) increment `attemptCount`. At 4 attempts, lead automatically moves to `NOT_PICKED_UP`. Device/network technical errors (`FAILED`) do NOT increment attempt counter.

### 2. Secret Lead Verification QA Subsystem
- **Non-Mutating Verification**: When a caller marks a lead `NOT_INTERESTED`, a `LeadVerification` QA record is spawned without mutating the original lead's assignment.
- **Sanitized Projection**: The secondary verifier (Employee B) accesses a completely sanitized lead view with prior call logs, notes, and employee identity stripped at the API layer.
- **Automated Mismatch Engine**: Detects divergence if Employee B marks the lead `INTERESTED`/`HOT`, creating an alert for Managers/Admins.

### 3. Geofenced Attendance Subsystem
- **Server-side Haversine Distance**: Evaluates browser GPS coordinates against organization office coordinates.
- **Accuracy Gates**: Checks GPS radius (<100m) and accuracy (<50m). Rejects spoofed or low-precision check-ins.
- **Break Session Engine**: Real-time tracking of active break sessions, daily working hours, and status.

### 4. Multi-Tenant Architecture
- Every entity is strictly scoped by `organizationId`.
- Database indexes enforce compound isolation `(organizationId, ...)`.
