import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { transformSync } from 'rolldown/experimental'

const assetExtensions = [
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]

/**
 * Lets `node --test` import the application's .jsx modules so a component can
 * be rendered in a test instead of only being asserted against as source text.
 *
 * The transform is oxc's, reached through the bundler Vite already builds with,
 * so the tests compile JSX exactly the way the application does and no new
 * dependency is introduced for it. Registered with:
 *
 *   node --import ./test-harness/register-jsx.mjs --test
 */
export async function load(url, context, nextLoad) {
  // Vite resolves an asset import to its served URL. Node cannot parse the
  // file at all, so the loader stands in for the bundler and hands back the
  // same kind of string, letting a component that ships an image be rendered.
  if (assetExtensions.some((extension) => url.endsWith(extension))) {
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(fileURLToPath(url))}`,
    }
  }

  if (!url.endsWith('.jsx')) return nextLoad(url, context)

  const filename = fileURLToPath(url)
  const source = await readFile(filename, 'utf8')
  const { code } = transformSync(filename, source, {
    jsx: { runtime: 'automatic' },
  })

  return { format: 'module', shortCircuit: true, source: code }
}
