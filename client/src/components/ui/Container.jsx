/**
 * Constrains page content while allowing the caller to choose its semantic tag.
 *
 * @param {object} props
 * @param {React.ElementType} [props.as]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function Container({ as: Element = 'div', className = '', children }) {
  return (
    <Element
      className={`mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </Element>
  )
}
