'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'

// Next's same-URL navigation may skip scrolling when its hash hasn't changed.
export default function SectionLink({ href, onClick, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} href={href} onClick={event => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      (props.target && props.target !== '_self') || props.download || typeof href !== 'string') return
    const destination = new URL(href, window.location.href)
    if (!destination.hash || destination.origin !== window.location.origin ||
      destination.pathname !== window.location.pathname || destination.search !== window.location.search) return
    const section = document.getElementById(decodeURIComponent(destination.hash.slice(1)))
    if (!section) return
    event.preventDefault()
    // Allow the mobile menu to close before moving the page.
    window.requestAnimationFrame(() => section.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    }))
  }} />
}
