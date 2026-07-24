# Backend Guidelines

## Why these guidelines exist

The API will manage identities, offices, listings, moderation, and financial
display data. Clear boundaries and defensive defaults are necessary before
those sensitive features are introduced.

## HTTP and architecture practices

- Keep `app.js` responsible for Express composition and `server.js` responsible
  for process startup.
- Keep routes declarative and controllers focused on HTTP adaptation.
- Put business rules in domain or application modules when features are added.
- Use versioned product routes under `/api/v1`; keep operational health routes
  outside the product version.
- Return consistent JSON success and error contracts.
- Use correct HTTP semantics and status codes.
- Keep external providers behind adapters so maps, storage, notifications, and
  analytics do not control domain rules.

## Validation and error handling

- Validate environment configuration before opening a port.
- Validate request parameters, queries, and bodies at the HTTP boundary with
  Zod.
- Normalize validated input before passing it to application behavior.
- Distinguish expected operational errors from unexpected failures.
- Never return stack traces, SQL details, filesystem paths, or secrets to API
  consumers.
- Preserve centralized 404 and error middleware as the final middleware.

## Security practices

- Treat authentication and authorization as separate concerns.
- Verify authorization for the resource and action, not only the user's role.
- Apply explicit CORS allowlists and review credential settings with the chosen
  JWT transport.
- Keep Helmet enabled and configure trusted proxies deliberately before
  deployment.
- Add rate limits appropriate to authentication, search, and write operations.
- Never log passwords, tokens, authorization headers, or sensitive request
  bodies.
- Store secrets in deployment-managed environment variables.
- Use database transactions for multi-write invariants.

Security comments should document the threat or invariant that justifies a
non-obvious control. They should not restate middleware names.

## Data and API best practices

- Keep physical properties separate from commercial listings.
- Model Syrian geography as structured relationships: governorate, city,
  district, and neighborhood.
- Store monetary amount and currency as separate validated fields.
- Use database constraints in addition to application validation.
- Design moderation and verification as explicit state transitions.
- Paginate collection endpoints and bound user-controlled queries.
- Avoid returning database records directly when a stable API response contract
  is required.

## Future extension points

- Prisma will implement persistence behind application boundaries.
- PostgreSQL migrations will enforce relational integrity.
- Authentication modules will add credential and token workflows.
- Background workers may process images, notifications, moderation events, and
  analytics.
- Readiness checks may verify required infrastructure separately from `/health`.
- Structured logging and request correlation can replace the initial access-log
  baseline.

## Protected decisions

- Never access raw `process.env` throughout feature code.
- Never put Prisma queries directly in routes.
- Never trust client-supplied ownership, moderation, role, or price-display
  decisions.
- Never use unrestricted production CORS.
- Never add public crash or debug endpoints.
- Never change middleware order without reviewing security, parsing, routing,
  and error propagation.
