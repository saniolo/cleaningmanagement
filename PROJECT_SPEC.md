PROJECT: Cleaning Workforce Management Platform

You are acting as a Senior Full-Stack Software Engineer, Software Architect and Product Engineer.

Your task is to design and implement the MVP of a production-ready web application for a cleaning company.

The application will initially be used by one cleaning company with approximately 20–30 employees, but its architecture must remain clean enough to support future evolution.

The priority is NOT to build as many features as possible.

The priority is to build a:

- simple;
- reliable;
- maintainable;
- secure;
- responsive;
- commercially usable

MVP that exactly matches the agreed scope.

Do not implement features outside the MVP unless explicitly requested.

⸻

1. PRODUCT OBJECTIVE

The application replaces manual organization of cleaning activities and weekly employee schedules.

The owner/manager currently needs to coordinate:

- employees;
- customers;
- recurring cleaning activities;
- weekly schedules;
- absences;
- replacement assignments.

The platform must provide a centralized operational view.

The fundamental workflow is:

CUSTOMERS
↓
SERVICES
↓
RECURRING SCHEDULES
↓
WEEKLY ASSIGNMENTS
↓
EMPLOYEES
↓
ABSENCES
↓
UNCOVERED ASSIGNMENTS
↓
REPLACEMENTS

The main product principle is:

The manager must always be able to understand who has to do what, where and when.

⸻

2. USERS AND ROLES

For the MVP there are two primary roles.

ADMIN / MANAGER

The owner or authorized manager of the cleaning company.

Can:

- manage employees;
- manage customers;
- manage services;
- configure recurring activities;
- view the weekly schedule;
- assign activities to employees;
- modify assignments;
- identify unassigned activities;
- receive absence requests;
- approve or reject absence requests;
- identify assignments affected by approved absences;
- propose replacement assignments;
- monitor replacement status.

EMPLOYEE

Can:

- authenticate;
- access a personal dashboard;
- see only their own relevant information;
- view their weekly schedule;
- view assignment details;
- view customer address;
- view operational notes;
- submit absence requests;
- see the status of absence requests;
- receive replacement proposals;
- accept replacement proposals;
- reject replacement proposals.

Employees MUST NOT have access to:

- other employees’ schedules;
- company-wide planning;
- customer management;
- employee management;
- administrative functions.

Authorization must be enforced server-side.

Never rely only on hiding UI elements.

⸻

3. TECH STACK

Use a modern production-ready TypeScript stack.

Preferred architecture:

Next.js
TypeScript
App Router
PostgreSQL
Prisma ORM
Tailwind CSS
shadcn/ui
Zod
React Hook Form

Authentication:

Use a mature authentication solution compatible with Next.js.

Preferred:

Better Auth

If technical compatibility creates unnecessary complexity, Auth.js may be used instead.

Do NOT implement authentication manually.

Use secure password hashing and session management provided by the authentication framework.

Deployment target:

Vercel

Database may be hosted on:

Neon

or another standard managed PostgreSQL provider.

The application must not depend unnecessarily on proprietary services.

⸻

4. ARCHITECTURAL PRINCIPLES

Follow these principles throughout the project.

Simplicity

Do not overengineer the MVP.

Prefer straightforward business logic over unnecessary abstraction.

Server-side security

All mutations must verify:

- authentication;
- authorization;
- ownership/scope;
- input validation.

Type safety

Avoid any.

Use strict TypeScript.

Validation

All user input must be validated server-side using Zod or equivalent.

Database integrity

Use:

- foreign keys;
- appropriate unique constraints;
- indexes;
- transactions where multiple related changes must succeed together.

Time handling

Scheduling is a core feature.

Store dates and times consistently.

The initial business operates in Italy.

Use:

Europe/Rome

as the initial business timezone.

Do not scatter timezone assumptions throughout the codebase.

Centralize timezone handling.

⸻

5. DOMAIN MODEL

Customer and location were originally modeled as two separate entities. In
practice a customer almost always maps 1:1 to a single site, and the extra
level added friction (an extra required step, an extra route level,
"customer · location" shown everywhere) without real payoff. They have been
merged into a single Customer entity that carries the address directly — see
section 6. Service and Assignment remain separate from Customer: they
represent different business concepts (what gets done, and when/by whom).

Use approximately the following domain model.

⸻

Company

Represents the cleaning company using the platform.

Fields:

id
name
timezone
createdAt
updatedAt

Even if the MVP initially has only one company, associate business data with companyId.

This keeps the architecture extensible without implementing a full SaaS tenant-management system.

⸻

User

Authentication identity.

Fields depend on the authentication framework.

Conceptually:

id
email
role
companyId
createdAt
updatedAt

Roles:

ADMIN
EMPLOYEE

⸻

Employee

Business profile associated with an employee user.

Suggested fields:

id
companyId
userId
firstName
lastName
phone
email
notes
active
createdAt
updatedAt

Keep employee data simple for MVP.

Do NOT implement payroll information.

Do NOT implement salary information.

⸻

6. CUSTOMERS

Customer

Represents both the contractual customer and the single site being cleaned
(the former separate Location entity has been merged into Customer — see
section 5). A business with more than one site is represented as multiple
Customer rows, one per site.

Example:

Condominio Verdi
Studio Rossi
Hotel Europa

Fields:

id
companyId
name
addressLine
city
postalCode
province
notes
active
createdAt
updatedAt

Do NOT implement geolocation/GPS functionality in the MVP.

Latitude/longitude are not required unless needed later.

⸻

7. SERVICES

A service represents a cleaning activity performed for a customer.

Example:

Customer:
Condominio Verdi
Service:
Pulizia scale

Suggested fields:

id
companyId
customerId
name
description
estimatedDurationMinutes
operationalNotes
active
createdAt
updatedAt

Example:

Pulizia scale
120 minutes

A customer may have multiple services.

Example:

Hotel Europa
├── Pulizia camere
├── Pulizia hall
└── Pulizia vetri

Do not assume one service per customer.

⸻

8. RECURRING SCHEDULES

Cleaning activities often repeat weekly.

Create a recurrence model that supports the MVP requirement:

activity duration, frequency and days of the week.

A recurring schedule should define:

service
dayOfWeek
estimatedDuration
effectiveFrom
effectiveUntil (optional)
active

No specific time of day is tracked — only which day the activity happens on
and how long it takes. The manager only needs to know who does what, on
which day, and for how long, not at which hour.

Example:

Service:
Pulizia scale
Monday
120 minutes

Another schedule can exist for the same service:

Thursday
120 minutes

For MVP, support weekly recurrence.

Do NOT build a generic Google Calendar-style recurrence engine.

Avoid unnecessary RRULE complexity unless clearly justified.

⸻

9. ASSIGNMENTS

An Assignment represents an actual scheduled activity on a specific date.

Example:

10 September 2026
Condominio Verdi
Pulizia scale
120 minuti
Mario Rossi

Suggested fields:

id
companyId
serviceId
employeeId nullable
date
durationMinutes
status
sourceRecurringScheduleId nullable
createdAt
updatedAt

Possible status:

UNASSIGNED
ASSIGNED

Replacement state should preferably be handled through replacement entities rather than overloading assignment status.

An assignment without an employee is valid and must appear as:

UNASSIGNED

in the manager dashboard.

⸻

10. GENERATION OF RECURRING ASSIGNMENTS

Recurring schedules are templates.

The application needs actual dated assignments for operational planning.

Design a deterministic strategy for generating upcoming assignments.

For example:

RecurringSchedule
↓
Generate assignments for upcoming planning window
↓
Assignment(date)

The generation logic MUST:

- avoid duplicates;
- respect active/inactive schedules;
- respect effective dates;
- be idempotent.

Do not create infinite future records.

A rolling planning horizon is acceptable.

Document the chosen strategy.

⸻

11. MANAGER DASHBOARD

This is the most important screen in the application.

Route example:

/admin/planning

The manager must see the current week.

Provide navigation:

← Previous week
Today
Next week →

The weekly view must make it easy to understand:

- employees;
- days;
- assignments;
- times;
- unassigned activities;
- absences.

A desktop-oriented weekly planning grid is recommended.

Possible conceptual structure:

              MON      TUE      WED      THU      FRI

Mario Job A Job B Job A Job C Job D
Anna Job C Job D Job B Job A Job C
Giuseppe Job B Job A Job C Job D Job B

Each assignment card should show at least:

time
customer
service
employee

where appropriate.

Clicking an assignment opens details/editing.

⸻

12. ASSIGNMENT MANAGEMENT

The manager must be able to:

- create an assignment;
- edit an assignment;
- assign an employee;
- change employee;
- change date;
- change duration;
- remove an employee;
- see assignment details.

There is no specific time of day to detect an overlap on, so assigning an
employee is never blocked by what else they have that day. Instead, when
choosing an employee (direct assignment or replacement proposal), show how
many activities and minutes they already have assigned that date, so the
manager can judge workload by eye.

For MVP, do NOT implement complex travel-time calculations.

⸻

13. UNASSIGNED ACTIVITIES

The manager must have an immediately visible section for:

ATTIVITÀ DA ASSEGNARE

An assignment may become unassigned because:

- it has never been assigned;
- an employee becomes unavailable;
- a replacement was rejected.

Unassigned activities must never disappear silently from the planning system.

This is a critical business requirement.

⸻

14. EMPLOYEE DASHBOARD

Route example:

/app

The employee experience must be mobile-first.

The employee should immediately see:

THIS WEEK

with daily sections.

Example:

LUNEDÌ 7 SETTEMBRE
Condominio Verdi
Via Roma 15
Pulizia scale · 120 minuti
Studio Rossi
Via Carducci 8
Pulizia uffici · 90 minuti

Assignment detail must show:

- date;
- duration;
- customer;
- address;
- service;
- operational notes.

Do not expose internal administrative information.

⸻

15. ABSENCE REQUESTS

Employees can create absence requests.

Supported types:

VACATION
PERMISSION
SICKNESS

Suggested fields:

id
companyId
employeeId
type
startDate
endDate
notes
status
reviewedBy
reviewedAt
createdAt
updatedAt

Status:

PENDING
APPROVED
REJECTED

Validation:

startDate <= endDate

Employees can see their request history and current status.

⸻

16. ABSENCE APPROVAL WORKFLOW

The manager needs an administrative page for absence requests.

Example:

/admin/absences

Display:

Employee
Type
Date range
Notes
Status

For pending requests provide:

APPROVE
REJECT

The important workflow begins when an absence is approved.

⸻

17. IMPACT OF AN APPROVED ABSENCE

When the manager approves an absence:

1. find assignments belonging to that employee;
2. restrict search to dates affected by the absence;
3. identify impacted assignments;
4. remove the unavailable employee from those assignments or mark them appropriately;
5. expose those activities as requiring reassignment.

This operation should be transactionally safe.

Never delete the actual cleaning activity because an employee is absent.

The business obligation still exists.

Only the employee allocation changes.

⸻

18. REPLACEMENT WORKFLOW

This workflow is explicitly part of the MVP.

The manager selects an uncovered assignment and proposes it to another employee.

Create a ReplacementRequest entity.

Suggested fields:

id
companyId
assignmentId
proposedEmployeeId
status
createdAt
respondedAt

Statuses:

PENDING
ACCEPTED
REJECTED
CANCELLED

Flow:

UNASSIGNED ACTIVITY
↓
Manager selects employee
↓
ReplacementRequest = PENDING
↓
Employee sees proposal
↓
ACCEPT / REJECT

⸻

19. REPLACEMENT ACCEPTANCE

When the employee accepts:

ReplacementRequest
PENDING → ACCEPTED

Then:

Assignment.employeeId = proposedEmployeeId

The operation should occur transactionally.

Before accepting, revalidate that:

- the assignment is still available;
- the replacement request is still pending;
- no conflicting accepted assignment has made the employee unavailable.

Avoid race conditions where two employees could become assigned to the same activity.

⸻

20. REPLACEMENT REJECTION

When the employee rejects:

ReplacementRequest
PENDING → REJECTED

The Assignment must remain:

UNASSIGNED

and immediately become available for another replacement proposal.

This behavior is a core contractual requirement.

⸻

21. EMPLOYEE REPLACEMENT UI

Employee dashboard must contain a clearly visible section:

RICHIESTE DI SOSTITUZIONE

Example:

Nuova attività
Giovedì 10 settembre
Condominio Verdi
Via Roma 15
120 minuti
[ RIFIUTA ] [ ACCETTA ]

After response, clearly show the result.

⸻

22. MANAGER REPLACEMENT UI

The manager should be able to open an unassigned assignment and select:

PROPONI SOSTITUZIONE

Display eligible active employees.

For MVP, “eligible” means primarily:

- active employee;
- not absent.

There is no time of day to detect an overlap on, so eligibility is never
narrowed by what else the employee has that day — instead, each eligible
employee is shown with how many activities and minutes they already have
assigned that date, so the manager can judge workload by eye.

Do NOT implement intelligent employee ranking.

Do NOT implement AI.

Do NOT implement geographic optimization.

⸻

23. RESPONSIVE DESIGN

Admin interface:

Desktop-first but responsive.

Employee interface:

Mobile-first.

Target common smartphone widths.

No native iOS or Android application is required.

The web application must work well from a mobile browser.

Optionally make the structure PWA-ready, but do not allow PWA work to delay the MVP.

⸻

24. UI / UX DIRECTION

The UI must look like a modern professional B2B SaaS product.

Style:

minimal
clean
professional
high information clarity
large whitespace
subtle borders
limited color palette
clear typography

Avoid:

- excessive gradients;
- decorative animations;
- glassmorphism;
- unnecessary charts;
- oversized marketing UI inside the application.

Use shadcn/ui consistently.

Create reusable components for:

PageHeader
DataTable
StatusBadge
EmptyState
ConfirmDialog
AssignmentCard
WeekNavigation
EmployeeSelector

Do not create abstraction for its own sake.

⸻

25. ADMIN NAVIGATION

Suggested sidebar:

Dashboard
Pianificazione
Dipendenti
Clienti e attività
Assenze
Attività da assegnare
Impostazioni

Keep navigation simple.

⸻

26. EMPLOYEE NAVIGATION

Suggested mobile navigation:

Settimana
Sostituzioni
Assenze
Profilo

⸻

27. NOTIFICATIONS — MVP INTERPRETATION

Do NOT build a complex push notification infrastructure.

The contractual MVP focuses on the workflow inside the application.

Provide clear in-app indicators for:

- new absence requests;
- pending replacement requests;
- uncovered assignments.

Email notifications may be added only if implementation is straightforward and explicitly approved.

Push notifications belong to future roadmap.

⸻

28. AUDITABILITY

Important business actions should not be ambiguous.

At minimum preserve timestamps for:

absence created
absence reviewed
replacement proposed
replacement accepted/rejected
assignment created/updated

Do not implement a complex enterprise audit-log system unless needed.

⸻

29. EMPTY STATES

Every major screen must have useful empty states.

Examples:

Nessun dipendente presente.
Nessuna attività programmata questa settimana.
Nessuna richiesta di assenza in attesa.
Nessuna attività da riassegnare.
Nessuna sostituzione da confermare.

Never leave blank unexplained screens.

⸻

30. ERROR HANDLING

Business errors must be understandable.

Avoid displaying raw exceptions.

Examples:

Questa attività è già stata assegnata.
La richiesta di sostituzione non è più disponibile.
Non hai i permessi necessari per eseguire questa operazione.

⸻

31. DATA SEEDING

Create realistic development seed data.

Example:

1 company
1 admin
10 employees
7 customers
10 services
multiple recurring schedules
2 absence requests
several weekly assignments
2 unassigned activities
2 pending replacement requests

Use Italian names and realistic cleaning-company scenarios.

This should allow all main workflows to be tested immediately.

⸻

32. TESTING PRIORITIES

Focus automated testing on business-critical logic.

At minimum test:

Authorization

Employee cannot access admin resources.

Employee cannot access another employee’s information.

Scheduling

Conflicting assignments are detected.

Absences

Approving an absence correctly identifies impacted assignments.

Replacement

Accepted replacement assigns the employee.

Rejected replacement leaves activity unassigned.

A replacement cannot be accepted twice.

Invalid/stale replacement requests cannot mutate assignments.

Recurrence

Assignment generation is idempotent.

No duplicate recurring assignments are created.

⸻

33. SECURITY REQUIREMENTS

Apply standard production security practices.

At minimum:

- secure authentication;
- server-side authorization;
- validated input;
- ORM parameterization;
- protected mutations;
- secure session cookies;
- no secrets committed to repository;
- environment variables documented;
- password hashing through authentication provider;
- companyId scoping on business queries.

Never trust IDs received from the client without checking access rights.

⸻

34. DATABASE INDEXES

Add appropriate indexes for frequently used queries.

Likely examples:

Assignment(companyId, date)
Assignment(employeeId, date)
AbsenceRequest(companyId, status)
AbsenceRequest(employeeId, startDate, endDate)
ReplacementRequest(assignmentId, status)
ReplacementRequest(proposedEmployeeId, status)
RecurringSchedule(companyId, active)

Adapt based on final Prisma schema.

⸻

35. OUT OF SCOPE — DO NOT IMPLEMENT

The following features belong to future roadmap and MUST NOT be implemented during MVP unless explicitly requested.

Intelligent scheduling

No automatic employee recommendation/ranking engine.

Digital time clock

No clock-in/clock-out.

Geolocation

No GPS tracking.

No employee location tracking.

Working-hours accounting

No payroll-grade worked-hours management.

No overtime calculation.

Route optimization

No geographic route planning.

Advanced notifications

No push notification infrastructure.

Economic analysis

No profitability calculation.

No employee cost management.

Reports and documents

No advanced reporting platform.

No document management system.

Also exclude unless explicitly requested:

payroll
invoicing
accounting
inventory
cleaning supplies management
CRM
native mobile apps
AI assistant
customer portal
electronic signatures
complex analytics

Do not implement roadmap functionality merely because it seems useful.

⸻

36. FUTURE-PROOFING WITHOUT OVERENGINEERING

Although roadmap features are excluded, avoid architectural decisions that make them unnecessarily difficult later.

For example:

- preserve clear Service/Customer separation;
- keep assignments as first-class records;
- maintain timestamps;
- keep employee/user separation;
- maintain companyId boundaries;
- centralize scheduling logic.

However:

DO NOT create unused microservices.

DO NOT create speculative tables for every future feature.

DO NOT implement event sourcing.

DO NOT introduce message queues unless currently necessary.

DO NOT split into multiple repositories.

Use a modular monolith.

⸻

37. RECOMMENDED PROJECT STRUCTURE

Use a clear feature-oriented structure.

Example:

src/
├── app/
│ ├── (auth)/
│ ├── admin/
│ │ ├── planning/
│ │ ├── employees/
│ │ ├── customers/
│ │ ├── absences/
│ │ └── unassigned/
│ │
│ └── app/
│ ├── page.tsx
│ ├── replacements/
│ ├── absences/
│ └── profile/
│
├── components/
│ ├── ui/
│ ├── planning/
│ ├── employees/
│ └── shared/
│
├── lib/
│ ├── auth/
│ ├── db/
│ ├── validation/
│ ├── permissions/
│ ├── scheduling/
│ └── dates/
│
└── types/

Adapt when necessary.

⸻

38. DEVELOPMENT STRATEGY

Do NOT attempt to implement the complete application in one uncontrolled pass.

Work incrementally.

Before coding, inspect the repository and produce:

1. Architecture proposal
2. Database schema proposal
3. Route map
4. Main business workflows
5. Milestone plan
6. Risks / ambiguities

Do not start major implementation until these are coherent.

⸻

39. MILESTONE PLAN

Use approximately this sequence.

MILESTONE 0 — Foundation

Deliver:

- Next.js project;
- TypeScript;
- Tailwind;
- shadcn/ui;
- PostgreSQL;
- Prisma;
- environment configuration;
- linting;
- formatting;
- basic application shell.

⸻

MILESTONE 1 — Authentication & authorization

Deliver:

- authentication;
- ADMIN role;
- EMPLOYEE role;
- protected routes;
- server-side authorization;
- admin layout;
- employee layout.

Test role isolation before continuing.

⸻

MILESTONE 2 — Core master data

Deliver:

- Employee CRUD;
- Customer CRUD;
- Service CRUD;
- active/inactive management;
- validation;
- empty states.

⸻

MILESTONE 3 — Recurring activities

Deliver:

- recurring weekly schedule;
- day-of-week configuration;
- time;
- duration;
- effective dates;
- generation of dated assignments;
- duplicate protection.

⸻

MILESTONE 4 — Weekly planning

Deliver:

- admin weekly view;
- previous/next week;
- assignment display;
- create/edit assignment;
- employee assignment;
- conflict detection;
- unassigned activities.

This milestone is business-critical.

Do not continue until planning is genuinely usable.

⸻

MILESTONE 5 — Employee dashboard

Deliver:

- mobile-first employee dashboard;
- weekly schedule;
- assignment details;
- customer;
- address;
- service;
- operational notes.

⸻

MILESTONE 6 — Absences

Deliver:

- employee absence request;
- absence history;
- manager pending requests;
- approve/reject;
- impacted assignment handling.

⸻

MILESTONE 7 — Replacements

Deliver:

- unassigned activity workflow;
- manager replacement proposal;
- employee pending replacement;
- accept;
- reject;
- reassignment;
- stale request protection.

⸻

MILESTONE 8 — Product hardening

Deliver:

- responsive review;
- permissions audit;
- validation audit;
- loading states;
- error states;
- empty states;
- database indexes;
- transaction review;
- seed data;
- automated critical-flow tests.

⸻

MILESTONE 9 — Production

Deliver:

- production database;
- environment variables;
- migrations;
- deployment;
- production admin;
- production smoke tests;
- README;
- backup considerations;
- basic operational documentation.

⸻

40. ACCEPTANCE CRITERIA

The MVP is considered complete only when this full scenario works:

Scenario A — Normal planning

Manager logs in.

Manager creates:

Customer
→ Service
→ recurring schedule

The service appears in weekly planning.

Manager assigns it to an employee.

Employee logs in.

Employee sees the activity in their weekly dashboard.

⸻

Scenario B — Absence

Employee submits vacation request.

Manager sees it.

Manager approves it.

Assignments affected by the absence are identified.

Those activities become clearly visible as requiring reassignment.

No service obligation is deleted.

⸻

Scenario C — Replacement accepted

Manager selects an uncovered activity.

Manager proposes it to another employee.

Employee sees the replacement proposal.

Employee accepts.

The employee becomes assigned to the activity.

The manager’s weekly planning updates accordingly.

⸻

Scenario D — Replacement rejected

Manager proposes another uncovered activity.

Employee rejects it.

The activity remains unassigned.

Manager can immediately propose it to someone else.

⸻

Scenario E — Security

Employee attempts to access:

/admin/*

Access is denied.

Employee attempts to query another employee’s schedule.

Access is denied server-side.

⸻

41. DEFINITION OF DONE

A milestone is NOT done because:

the page renders

It is done when:

- business flow works;
- authorization works;
- validation works;
- errors are handled;
- mobile/desktop layout is appropriate;
- database state remains consistent;
- relevant tests pass;
- lint passes;
- TypeScript passes;
- no known critical regression exists.

⸻

42. CODE QUALITY RULES

Always:

- prefer readable code;
- keep business logic outside large UI components;
- use meaningful names;
- use server components where appropriate;
- use client components only where interaction requires them;
- minimize unnecessary client-side JavaScript;
- avoid duplicated business logic;
- validate mutations server-side;
- use transactions for critical multi-step mutations;
- document non-obvious decisions.

Never:

- silence TypeScript errors without justification;
- use any casually;
- hardcode production credentials;
- expose secrets;
- bypass authorization because the UI already hides something;
- fake functionality;
- leave TODO functionality appearing complete to users.

⸻

43. LANGUAGE

The application UI must initially be in:

Italian

Code, database naming and technical documentation should use:

English

Example:

UI:

Attività da assegnare
Richiesta ferie
Accetta sostituzione

Code:

UnassignedAssignment
AbsenceRequest
ReplacementRequest

This separation must remain consistent.

⸻

44. COMMERCIAL SCOPE PROTECTION

This project is a paid MVP.

Therefore scope discipline is important.

Whenever you identify something that would improve the product but is not necessary for the agreed MVP:

DO NOT automatically implement it.

Instead report:

FUTURE IMPROVEMENT
Description:
...
Business value:
...
Estimated implementation complexity:
LOW / MEDIUM / HIGH

Then continue with the agreed MVP.

⸻

45. FIRST TASK

Do NOT immediately generate the entire application.

First:

1. inspect the existing repository;
2. identify the current state;
3. compare it with this specification;
4. propose the final Prisma/domain model;
5. propose the route structure;
6. describe the recurrence strategy;
7. describe the absence → uncovered assignment → replacement workflow;
8. identify architectural risks or ambiguities;
9. create a detailed milestone checklist;
10. identify which decisions genuinely require clarification.

For each ambiguity:

- recommend a sensible MVP default;
- explain briefly why;
- avoid blocking development when a safe assumption can be made.

Then stop.

Wait for approval before implementing Milestone 0.

Do not implement future milestones ahead of schedule.
