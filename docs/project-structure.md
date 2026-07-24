# Project Structure

## Why this structure exists

The repository separates deployable applications, shared application concerns,
and durable documentation. A file's location should communicate its owner and
dependency direction before a developer reads its contents.

## Current structure

```text
.
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── common/
│       │   ├── home/
│       │   ├── layout/
│       │   └── ui/
│       ├── constants/
│       ├── context/
│       ├── hooks/
│       ├── i18n/
│       │   └── messages/
│       ├── layouts/
│       ├── pages/
│       └── styles/
├── server/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       └── routes/
└── docs/
```

## Responsibilities

- `client/src/assets`: bundled visual assets. Brand assets must be replaceable
  without changing application behavior.
- `client/src/components/ui`: domain-neutral interaction primitives.
- `client/src/components/common`: shared composed components with no page owner.
- `client/src/components/layout`: global navigation and page-shell components.
- `client/src/components/<feature>`: components owned by one product area.
- `client/src/layouts`: route-level shells and outlet composition.
- `client/src/pages`: route entry components that compose features.
- `client/src/hooks`: reusable stateful behavior, not arbitrary helper
  functions.
- `client/src/context`: narrowly scoped application providers.
- `client/src/i18n`: translation mechanics and locale messages.
- `client/src/styles`: tokens, reset rules, and truly global CSS.
- `server/src/config`: validated runtime configuration.
- `server/src/middleware`: cross-request HTTP policies.
- `server/src/routes`: URL and HTTP-method declarations.
- `server/src/controllers`: HTTP adaptation; future business rules belong in
  application modules rather than controllers.
- `docs`: decisions and standards that outlive individual tasks.

## Best practices

- Import through explicit module paths.
- Keep pages thin and compose focused components.
- Keep domain-specific code near its domain.
- Promote code to shared folders only after repeated use demonstrates a stable
  abstraction.
- Prefer one responsibility per file and descriptive names over generic
  `helpers`, `manager`, or `misc` modules.
- Update this document when adding a new top-level responsibility.

## Future extension points

The client may add feature folders containing their own components, hooks,
services, schemas, and tests. The server may add domain modules with clear
application, domain, and infrastructure boundaries. A shared workspace may be
added for transport contracts when both applications genuinely consume them.

Testing folders should be colocated where practical, with repository-level
end-to-end tests added only when cross-application workflows exist.

## Protected boundaries

- Do not import server code from the client.
- Do not place business rules in route declarations, React pages, or database
  adapters.
- Do not create circular imports between features and shared modules.
- Do not use `utils` as a dumping ground; utilities must be pure, clearly named,
  and broadly reusable.
- Do not move branding into component-local constants.
- Do not add a folder solely to imitate an architecture diagram; add it when it
  owns real behavior.
