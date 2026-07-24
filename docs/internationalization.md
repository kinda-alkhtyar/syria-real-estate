# Internationalization

## Why this architecture exists

Dar Syria serves an Arabic-first market while also supporting English and
German. Locale affects copy, reading direction, typography, formatting, layout,
and accessibility metadata. It cannot be treated as a final translation pass.

## Current model

Locale definitions store language codes and direction. The locale provider:

- selects the active dictionary;
- updates the document `lang` and `dir`;
- exposes a translation function;
- localizes page title and description metadata;
- falls back to English for missing entries.

Messages are separated by locale under `client/src/i18n/messages`. Components
depend on translation keys rather than importing dictionaries.

## Best practices

- Add every visible string to all supported dictionaries.
- Use stable semantic keys such as `actions.addProperty`, not English sentences
  as keys.
- Keep locale-native language names in the language selector.
- Use CSS logical properties and Tailwind start/end utilities.
- Keep DOM order semantic; do not reverse markup manually for RTL.
- Mirror only icons whose meaning is directional.
- Test German expansion, Arabic wrapping, mixed numbers, and bidirectional text.
- Use `Intl` APIs for future currency, number, and date formatting.
- Keep USD and SYP currency identifiers explicit; locale formatting must not
  change the underlying currency.

Arabic translation quality should be reviewed by a fluent product reviewer.
Automated direction tests do not establish linguistic accuracy.

## Future extension points

- Persist locale preference after the consent and account strategy is defined.
- Add locale-aware routes if search indexing or shareable language URLs require
  them.
- Introduce pluralization and richer message formatting.
- Lazy-load dictionaries if translation size becomes material.
- Replace the internal implementation with a dedicated library behind the
  existing `t(key, variables)` interface.
- Add localized validation messages without coupling domain errors to one
  language.

## Protected decisions

- Never hardcode `dir` inside a component.
- Never use physical left/right spacing for direction-sensitive layout.
- Never concatenate translated sentence fragments.
- Never use locale to infer currency, nationality, permissions, or property
  location.
- Never add visible copy in only one language.
- Never silently replace a missing translation with unrelated copy.
- Never change translation keys without updating all consumers and dictionaries.
