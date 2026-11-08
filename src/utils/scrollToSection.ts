/** Smooth-scroll to an element by id; respects prefers-reduced-motion. */
export const scrollToSection = (id: string, behavior?: ScrollBehavior) => {
  const el = document.getElementById(id)
  if (!el) return false

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({
    behavior: behavior ?? (reduced ? 'auto' : 'smooth'),
    block: 'start',
  })
  return true
}
