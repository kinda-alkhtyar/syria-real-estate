import { Check } from 'lucide-react'

export default function PropertyAttributeList({ attributes, title, titleId }) {
  if (!attributes?.length) return null

  return (
    <section aria-labelledby={titleId}>
      <h2 className="text-2xl font-semibold" id={titleId}>
        {title}
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {attributes.map((attribute) => (
          <li
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4"
            key={attribute}
          >
            <Check aria-hidden="true" className="text-accent" size={18} />
            <span>{attribute}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
