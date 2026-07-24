# Frontend Guidelines

## Why these guidelines exist

The client must remain accessible, responsive, locale-safe, and maintainable as
property discovery, dashboards, and account workflows are introduced.

## Component and state practices

- Use functional React components.
- Keep route pages focused on composition.
- Keep reusable controls in `components/ui` and feature behavior with its
  feature.
- Prefer props and composition over inheritance.
- Store only source state. Derive filtered, formatted, or selected views during
  rendering when practical.
- Use effects only to synchronize with external systems.
- Keep server data in TanStack Query when API integration begins; do not copy it
  into global context without a specific reason.
- Use stable domain identifiers as list keys.

Reusable hooks and complex component APIs should receive brief JSDoc when their
constraints are not obvious from names and types. Comments should explain why a
browser workaround or architectural boundary exists.

## Responsive best practices

- Start with the narrowest supported layout.
- Use content-driven breakpoints, fluid containers, flexible grids, and bounded
  `clamp()` typography.
- Use `min-width: 0` where grid or flex children contain expandable text.
- Avoid `100vw` for page sections because scrollbar width can create overflow.
- Maintain comfortable touch targets on phones and tablets.
- Test long German labels and Arabic content between named breakpoints, not only
  at device presets.
- Use `100svh` or `100dvh` only with an appropriate fallback for older Safari
  behavior.

## Accessibility best practices

- Use semantic elements before adding ARIA.
- Use buttons for actions and links for navigation.
- Provide programmatic labels for every form control and icon-only action.
- Preserve logical heading order and landmark structure.
- Keep visible `:focus-visible` styles.
- Verify keyboard activation, focus order, menu state, and Escape behavior.
- Respect `prefers-reduced-motion`.
- Treat WCAG contrast as a release requirement, including hover and focus
  states.

## Performance best practices

- Do not install a library for behavior that platform APIs or existing
  dependencies handle clearly.
- Lazy-load route features when bundle analysis shows a useful boundary.
- Import icons individually.
- Size and encode real-estate media appropriately; defer off-screen media.
- Avoid effects that cause duplicate network requests or layout measurements.
- Measure bundle and rendering changes rather than optimizing from intuition.

## Future extension points

- React Router will own product routes and route-level loading boundaries.
- TanStack Query will own API server state.
- Feature folders may add services, validation schemas, and tests.
- A specialized i18n package may replace the internal implementation behind the
  existing translation interface.
- A tested theme controller may be added without changing semantic tokens.

## Protected decisions

- Never hardcode visible copy in JSX.
- Never create separate RTL and LTR component implementations.
- Never bypass design tokens with arbitrary brand values without design review.
- Never suppress focus outlines without an accessible replacement.
- Never store JWTs or server secrets in presentation modules.
- Never claim browser compatibility without recording the browsers and devices
  actually tested.
