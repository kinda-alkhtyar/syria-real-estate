# Dar Syria

Dar Syria is a production-oriented real-estate platform for the Syrian market.
The product is being designed for individuals, real-estate offices, and
administrators, with Arabic and RTL support treated as foundational concerns.

## Technology

- Client: React, Vite, React Router, Tailwind CSS
- Server: Node.js, Express, Zod
- Planned data layer: PostgreSQL and Prisma
- Package management: npm workspaces

## Requirements

- Node.js 24 or a compatible current LTS release
- npm 11 or a compatible workspace-aware release

## Installation

```bash
npm install
```

The repository uses one root lockfile. Do not create package lockfiles inside
individual workspaces.

## Development

```bash
npm run dev:client
npm run dev:server
```

The server requires local environment configuration:

```bash
cp server/.env.example server/.env
```

Never commit a real `.env` file.

## Quality checks

```bash
npm run lint:client
npm run build:client
```

Server-specific linting and automated test commands will be added with their
respective milestones.

## Repository overview

```text
client/   React application and browser assets
server/   Express API and server configuration
docs/     Architecture and engineering standards
```

The current visible client contains the global design system, Header, Footer,
and layout foundation. Existing homepage experiments are intentionally
unmounted until the next approved product milestone.

## Engineering documentation

- [Architecture decisions](docs/architecture-decisions.md)
- [Project structure](docs/project-structure.md)
- [Frontend guidelines](docs/frontend-guidelines.md)
- [Backend guidelines](docs/backend-guidelines.md)
- [Internationalization](docs/internationalization.md)
- [Design system](docs/design-system.md)

Read the relevant document before changing a shared boundary. Architectural
changes should update documentation in the same commit as the implementation.
