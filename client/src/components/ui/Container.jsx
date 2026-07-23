export default function Container({ as: Element = 'div', className = '', children }) {
  return (
    <Element
      className={`mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8 xl:px-12 ${className}`}
    >
      {children}
    </Element>
  )
}
