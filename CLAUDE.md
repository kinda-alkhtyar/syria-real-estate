# Dar Syria Project Rules

## Communication
- Respond to me in clear Arabic.
- Guide me one step at a time.
- Keep responses concise to reduce usage.

## Scope & Editing
- Default to read-only analysis.
- Do not edit files unless I explicitly request implementation.
- Before editing, list the exact files needed and the proposed changes.
- Read only the minimum files required for the current task.
- Never scan the entire repository unless I explicitly request it.
- Prefer minimal targeted edits over full-file rewrites.
- Do not add dependencies or duplicate components without permission.
- Stop after completing the requested scope.

## Safety
- Preserve all existing uncommitted changes.
- Never use destructive Git commands.
- Never commit, push, pull, merge, rebase, reset, restore, clean, delete, rename, or move files without explicit permission.
- Never access, expose, or modify .env files or secrets.
- Do not modify backend, APIs, database, Prisma, authentication, routing, hooks, state management, schemas, or deployment unless explicitly requested.

## Product & Design
- Preserve existing functionality, architecture, accessibility, responsive behavior, i18n, and RTL/LTR support.
- Arabic uses RTL. English and German use LTR.
- For design work, treat the latest approved Figma design as the visual source of truth.
- Inspect only the requested Figma section or component.
- Use Grid, Flexbox, containers, gap, and padding; do not build complete pages with absolute positioning.

## Reporting
- After implementation, report the exact files changed and validations performed.
