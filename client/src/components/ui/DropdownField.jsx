import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * Renders a labelled listbox dropdown that always opens below its field.
 *
 * Mirrors SelectField styling and keyboard behaviour while keeping the panel
 * anchored under the control so it never overlaps the trigger.
 *
 * @param {object} props
 * @param {string} [props.className]
 * @param {string} props.id
 * @param {string} props.label
 * @param {string} props.name
 * @param {(value: string) => void} props.onChange
 * @param {Array<{label: string, value: string}>} props.options
 * @param {string} props.value
 */
export default function DropdownField({
  className = '',
  id,
  label,
  name,
  onChange,
  options,
  value,
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()
  const labelId = `${id}-label`
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : options[0]

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const openList = (index) => {
    setActiveIndex(index)
    setOpen(true)
  }

  const closeList = ({ focusTrigger = true } = {}) => {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }

  const commit = (index) => {
    const option = options[index]
    if (option) onChange(option.value)
    closeList()
  }

  const handleKeyDown = (event) => {
    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) openList(currentIndex)
        else setActiveIndex((index) => Math.min(index + 1, options.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) openList(currentIndex)
        else setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Home':
        if (!open) break
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        if (!open) break
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) commit(activeIndex)
        else openList(currentIndex)
        break
      case 'Escape':
        if (!open) break
        event.preventDefault()
        closeList()
        break
      case 'Tab':
        if (open) setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div className={`min-w-0 ${className}`} ref={containerRef}>
      <span
        className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted"
        id={labelId}
      >
        {label}
      </span>
      <div className="relative">
        <button
          aria-controls={listId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={`${labelId} ${id}`}
          className="flex min-h-13 w-full items-center justify-between gap-2 rounded-lg border border-input-line bg-input px-4 py-2 text-start text-sm font-medium text-ink outline-none transition duration-fast ease-standard hover:border-focus/40 focus:border-focus focus:ring-3 focus:ring-focus/20 motion-reduce:transition-none"
          id={id}
          onClick={() => {
            if (open) closeList({ focusTrigger: false })
            else openList(selectedIndex >= 0 ? selectedIndex : 0)
          }}
          onKeyDown={handleKeyDown}
          ref={triggerRef}
          type="button"
        >
          <span className="min-w-0 truncate">{selectedOption?.label}</span>
          <ChevronDown
            aria-hidden="true"
            className={`shrink-0 text-muted transition duration-fast ease-standard motion-reduce:transition-none ${
              open ? 'rotate-180' : ''
            }`}
            size={18}
          />
        </button>
        <input name={name} type="hidden" value={value} />
        <ul
          aria-labelledby={labelId}
          className={`absolute inset-x-0 top-full z-20 mt-2 max-h-64 origin-top overflow-auto rounded-lg border border-line bg-surface p-1 shadow-md transition duration-fast ease-standard motion-reduce:transition-none ${
            open
              ? 'visible translate-y-0 opacity-100'
              : 'invisible -translate-y-1 opacity-0'
          }`}
          id={listId}
          ref={listRef}
          role="listbox"
          tabIndex={-1}
        >
          {options.map((option, index) => (
            <li
              aria-selected={option.value === value}
              className={`cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium text-ink transition duration-fast ease-standard motion-reduce:transition-none ${
                index === activeIndex && open ? 'bg-canvas' : ''
              } ${option.value === value ? 'text-accent' : ''}`}
              data-index={index}
              key={option.value}
              onClick={() => commit(index)}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
            >
              {option.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
