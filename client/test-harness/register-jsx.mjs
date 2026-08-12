import { register } from 'node:module'

// Entry point for `node --import ./test-harness/register-jsx.mjs --test`: installs
// the .jsx hook from jsx-loader.mjs before any test module is resolved.
register('./jsx-loader.mjs', import.meta.url)
