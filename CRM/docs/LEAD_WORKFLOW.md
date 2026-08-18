# Lead Workflow, High-Throughput Engine & Secret QA

## 1. Lead Lifecycle & Permitted State Transitions

```
[ NEW ]
   |
   +---> [ CALLING ]
            |
            +---> [ NOT_CONNECTED / BUSY / NO_ANSWER ] ---> (Attempt Count < 4) ---> [ FOLLOW_UP ] / Retry
            |                                          ---> (Attempt Count >= 4) ---> [ NOT_PICKED_UP ]
            |
            +---> [ NOT_INTERESTED ] (Mandatory Reason Required)
            |        |
            |        +---> Optional [ Secret Verification Task Created ] ---> Assigned to Verifier
            |
            +---> [ INTERESTED ]
                     |
                     +---> Temperature: [ HOT ] / [ WARM ] / [ COLD ]
                     |
                     +---> [ SITE_VISIT ]
                              |
                              +---> [ NEGOTIATION ]
                                       |
                                       +---> [ BOOKED ] ---> [ CLOSED ]
```

---

## 2. High-Throughput Daily Workflow (~300 Leads/Day/Caller)

1. **Daily Call Queue**:
   - Order: (1) Overdue Follow-ups, (2) Today's Scheduled Follow-ups, (3) Fresh New Leads, (4) Retry Leads (Attempt Count 1-3).
2. **Next-Lead Auto Progression**:
   - Upon saving a disposition, the CRM automatically fetches and transitions focus to the next queued lead without navigating back to the table.
3. **One-Click Quick Dispositions**:
   - Buttons for fast actions: `Quick Busy (1h callback)`, `Quick No Answer (3h callback)`, `Quick Budget Mismatch`, `Quick Already Purchased`.
4. **Duplicate Phone Detection**:
   - Phone numbers are normalized (removing spaces, symbols, leading zeros, country code normalization).
   - Bulk CSV/Excel imports reject or merge existing leads matching normalized phone within the organization.
5. **Round-Robin Assignment**:
   - Unassigned leads can be distributed in equal batches across all active team members.

---

## 3. Secret Lead Verification QA Workflow

1. Employee A marks Lead as `NOT_INTERESTED` with reason (e.g. `BUDGET`).
2. Backend creates a `LeadVerification` QA record linked to the lead.
3. The lead is assigned to Employee B via `VerificationAssignment`.
4. **API-Level Projection Sanitization**:
   - Employee B's endpoint `GET /leads/verification-queue` and `GET /leads/:id` produces a stripped view:
     - Employee A's name: HIDDEN
     - Prior Call Recordings: HIDDEN
     - Prior Notes & Dispositions: HIDDEN
     - QA / Verification Status: HIDDEN
5. Employee B calls the customer and submits an independent disposition.
6. **Mismatch Evaluation**:
   - If Employee B marks `INTERESTED`, `HOT`, or `WARM`, the system generates `DISPOSITION_MISMATCH`.
   - Alert is flagged on Manager & Admin dashboards with severity metric.
