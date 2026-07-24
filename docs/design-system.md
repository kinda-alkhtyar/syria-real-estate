# Design System

## Why this system exists

Dar Syria needs a consistent premium identity that can evolve without coupling
branding to individual components. The target balance is modern European
clarity with restrained Gulf warmth: bright, spacious, credible, and elegant.

## Token architecture

`client/src/styles/tokens.css` owns:

- semantic brand and surface colors;
- text, border, and focus colors;
- typography and line-height scales;
- spacing;
- radii;
- shadows;
- motion timing and easing;
- z-index layers.

`reset.css` normalizes browser behavior. `globals.css` integrates Tailwind and
contains only genuinely global visual utilities.

Components should use semantic names such as `surface`, `ink`, and `accent`
rather than encoding specific hex values or theme assumptions.

## Best practices

- Use deep green for structure and warm bronze as a limited accent.
- Preserve generous whitespace and clear alignment.
- Prefer quiet borders and restrained shadows over decorative effects.
- Keep radii moderate; pills are reserved for content whose shape benefits from
  them.
- Use one primary action per local decision area.
- Keep typography readable in both Arabic and Latin scripts.
- Verify token contrast in normal, hover, disabled, and focus states.
- Use motion to explain state change, not decorate every element.
- Route all transitions through motion tokens and respect reduced motion.
- Use z-index tokens rather than arbitrary large values.

Brand logos, photography, and illustrations belong in replaceable asset files.
Components should expose stable layout contracts rather than depend on one
specific image composition.

## Component boundaries

- UI primitives own reusable interaction and visual variants.
- Common components compose primitives without acquiring page-specific rules.
- Layout components own navigation and global structure.
- Feature components own domain presentation.

Add a new component variant only when it represents a repeated product need.
Avoid boolean-prop combinations that produce unclear visual states.

## Future extension points

- Add alternate themes by redefining semantic tokens under a new
  `data-theme` value.
- Replace brand assets without changing navigation or layout behavior.
- Add documented form, feedback, overlay, data-display, and skeleton patterns
  as real features require them.
- Introduce visual regression tests when stable page designs exist.
- Add approved Arabic and Latin web fonts after licensing, glyph, loading, and
  performance review.

## Protected decisions

- Never scatter raw brand colors, shadows, radii, motion durations, or z-index
  values through components.
- Never use heavy gradients, excessive gold, broad glassmorphism, or dark
  dashboard styling as shortcuts for premium presentation.
- Never remove focus styles or reduce touch targets for visual compactness.
- Never add a font without evaluating Arabic coverage and loading behavior.
- Never change semantic token meaning to fix one component; introduce or refine
  the correct token.
- Never claim a new theme is supported until components and contrast have been
  tested in that theme.
