# Architecture Defense Document: FlexFit Studio Refactoring

## Executive Summary
This document presents the architectural rationale, design patterns, transaction boundaries, and behavior preservation verifications for the refactored **FlexFit Studio** web application.

The application was restructured from a monolithic, procedural ~5,400-line layout into a **Feature-Driven Layered Service Architecture** with a **Modular Database Schema**.

---

## 1. Architectural Patterns & Domain Boundaries

### 1.1 Modular Database Schema (`src/db/schema/`)
The monolithic `schema.ts` file has been cleanly decomposed into distinct domain modules without altering table names, column definitions, data types, or foreign key constraints:
- `users.ts`: User identities, authentication sessions, and role definitions.
- `memberships.ts`: Membership plans, active subscriptions, corporate company profiles, and corporate membership links.
- `classes.ts`: Class definitions, schedules, instances, and trainer availability rules.
- `bookings.ts`: Individual class bookings, corporate bookings, check-in records, and reschedule logs.
- `transactions.ts`: Payment ledger and system notifications.
- `index.ts` & `schema.ts`: Central re-export roots guaranteeing 100% backwards compatibility for existing imports across the application.

### 1.2 Feature-Driven Folder Structure (`src/features/`)
Application logic is partitioned into standalone domain feature modules:
```
src/features/
├── members/
│   ├── services/       # Member profile, plan purchase & credit top-up logic
│   └── types.ts        # Zod validation schemas & TypeScript types
├── bookings/
│   ├── services/       # Booking, corporate booking & waitlist promotion engine
│   ├── components/     # Domain components (e.g. RescheduleModal)
│   └── types.ts        # Booking schemas
├── waitlists/
│   ├── services/       # Queue management & positioning logic
│   └── types.ts        # Waitlist schemas
├── classes/
│   ├── services/       # Class scheduling, roster & lifecycle management
│   └── types.ts        # Class schemas
├── trainers/
│   ├── services/       # Trainer schedules & substitute requests
│   └── types.ts        # Trainer schemas
├── front-desk/
│   ├── services/       # Attendance check-ins, company administration & audit logs
│   └── types.ts        # Front-desk schemas
└── revenue/
    ├── services/       # Revenue reporting & admin analytics aggregations
    └── types.ts        # Analytics schemas
```

---

## 2. Business Logic, Payment Hierarchy & Transaction Safety

### 2.1 Credit Deduction Order
When a class booking is initiated, the system adheres to a strict multi-tier hierarchy:
1. **Active Membership Allowance**: Checked first (`endDate >= today` and valid remaining allowance).
2. **Individual Credits**: Checked second (`creditsRemaining >= creditCost`).
3. **Corporate Company Credit Pool**: Checked third for corporate members with active company links.
4. **Transaction Log**: All credit modifications record itemized transactions to guarantee an auditable paper trail.

### 2.2 Waitlist Positioning & Auto-Promotion Engine
- **Position Allocation**: Assigned sequentially (`count + 1`).
- **Atomic Promotion**: When a confirmed booking is cancelled, the system triggers `promoteNextWaitlistedUser` inside an atomic `db.transaction()` block.
- **Credit Deduction on Promotion**: Checks candidate payment eligibility, deducts credits/allowances, confirms booking, notifies the user, and shifts remaining queue positions (`position = position - 1`).

### 2.3 Corporate Credit Pools & Front-Desk Overrides
- **Corporate Credit Pools**: Shared company credit balances automatically deduct and refund credits on booking creation and cancellation.
- **Front-Desk Overrides**: Staff procedures delegate check-ins, manual capacity overrides, and credit adjustments to isolated service layers with strict audit trails.

---

## 3. Verification & Compatibility Check

- **Import Integrity**: 100% backwards compatibility maintained through re-export roots in `src/db/schema.ts` and `src/server/api/root.ts`.
- **Side-Effect Equivalence**: All side-effects (notifications, refunds, waitlist shifts, attendance check-ins) remain preserved without deviation.
- **Type Safety**: Full end-to-end TypeScript type inference via tRPC sub-routers and Zod schemas.

---

## 4. Conclusion
The refactored architecture establishes a clean, modern, and extensible foundation for FlexFit Studio while guaranteeing zero regression in application behavior.
