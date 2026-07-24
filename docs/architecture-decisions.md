# Architecture Decisions

This document records decisions whose consequences span multiple modules or
deployment environments. Detailed implementation rules live in the linked
guideline documents.

## Decision 1: npm workspace monorepo

**Why it exists:** The client and server are independently deployable
applications that still need coordinated dependency resolution and development
commands.

**Decision:** Keep `client` and `server` as npm workspaces managed by the root
manifest and one root lockfile.

**Best practices:** Application dependencies belong to the workspace that uses
them. Root scripts coordinate workspaces rather than importing application
code.

**Extension points:** Shared packages may be introduced when genuinely reused
contracts or tooling exist. They should become explicit workspaces rather than
informal cross-directory imports.

**Protected impact:** Do not add nested lockfiles, move application dependencies
to the root for convenience, or make one workspace depend on another's internal
files without reviewing installation and deployment consequences.

## Decision 2: separate browser and server boundaries

**Why it exists:** Browser code and trusted server code have different security,
runtime, and deployment constraints.

**Decision:** Browser code stays in `client`; HTTP, configuration, and future
data access stay in `server`.

**Best practices:** Communicate through documented HTTP contracts. Never import
server modules into the client or expose server secrets through Vite variables.

**Extension points:** A shared contract package may later contain schemas and
serializable types, provided it has no Node-only or browser-only behavior.

**Protected impact:** Changing this boundary affects security, bundling, caching,
and independent deployment and requires an explicit architecture review.

## Decision 3: composition roots

**Why it exists:** Runtime startup should not be coupled to application
construction.

**Decision:** `server/src/app.js` composes Express; `server/src/server.js` starts
the process. The client entry composes providers, while routes and layouts own
screen composition.

**Best practices:** Keep side effects at entry points. Importing the Express app
must not open a port.

**Extension points:** Tests, serverless adapters, queues, and scheduled workers
can reuse application modules without reproducing configuration.

**Protected impact:** Do not move `listen()` into the Express app or put page
markup back into the client entry file without understanding testability and
runtime coupling.

## Decision 4: feature-oriented growth

**Why it exists:** Large global controller, service, and component folders mix
unrelated business capabilities as a product grows.

**Decision:** Introduce product behavior by feature or domain while retaining
small shared infrastructure and UI boundaries.

**Best practices:** Colocate feature-specific components, validation, services,
and tests. Promote code to shared folders only after genuine reuse is proven.

**Extension points:** Expected domains include users, organizations, locations,
properties, listings, moderation, favorites, and comparisons.

**Protected impact:** Do not create empty enterprise layers or one global
`services` directory containing every domain. Physical properties and commercial
listings must remain distinct concepts.

## Decision 5: semantic design tokens

**Why it exists:** Branding and theme changes should not require rewriting
component markup.

**Decision:** Components consume semantic tokens; primitive visual choices live
in the design-token layer.

**Best practices:** Name tokens by purpose, verify contrast, and keep component
variants limited.

**Extension points:** Additional themes, brand refreshes, and white-label assets
can redefine tokens and replace assets behind stable component APIs.

**Protected impact:** Do not scatter raw brand colors, shadows, or z-index values
through JSX. Review [Design System](design-system.md) before changing tokens.

## Decision 6: locale-driven direction

**Why it exists:** Arabic RTL is a core product requirement, not a later visual
translation.

**Decision:** Locale metadata controls document language and direction. Visible
layout text comes from translation dictionaries.

**Best practices:** Use logical CSS properties and one semantic component tree
for RTL and LTR.

**Extension points:** The internal translation boundary may later be backed by a
specialized library without changing component call sites.

**Protected impact:** Never hardcode direction inside components or create
separate Arabic layouts. Review
[Internationalization](internationalization.md) first.

## Decision 7: secure configuration boundary

**Why it exists:** Environment variables are untrusted strings and configuration
errors should fail before traffic is accepted.

**Decision:** The server loads configuration once, validates it with Zod, and
exports normalized immutable values.

**Best practices:** Document safe examples, inject real secrets at runtime, and
read validated configuration rather than `process.env` across the codebase.

**Extension points:** Database URLs, JWT settings, storage providers, and
observability settings belong in the validated schema when introduced.

**Protected impact:** Never add secrets to examples, client variables, logs, or
source control. Schema changes affect every deployment environment.

## Decision 8: staged product delivery

**Why it exists:** Architecture is easier to verify when infrastructure, layout,
and business behavior are introduced in reviewable milestones.

**Decision:** The Step 4 homepage experiment remains unmounted while the Step 5
global design and layout foundation is reviewed.

**Best practices:** Each milestone must lint, build, and document changed
boundaries before the next feature begins.

**Extension points:** Approved page milestones can reuse or replace the dormant
homepage components through route composition.

**Protected impact:** Do not remount experimental pages or treat placeholder
content as production data without an approved product scope and translation
coverage.
