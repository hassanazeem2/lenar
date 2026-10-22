// Per-page <title> and description, so tabs, bookmarks and search results name the page.
// The defaults in index.html cover link previews (crawlers don't run this script).
import { useEffect } from 'react'

const DEFAULT_TITLE = 'lenar — one key, every model'

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    const [, k, v] = selector.match(/\[(\w+)="([^"]+)"\]/)
    el.setAttribute(k, v)
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

export function usePageMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title || DEFAULT_TITLE
    if (description) {
      setMeta('meta[name="description"]', 'content', description)
      setMeta('meta[property="og:title"]', 'content', title)
      setMeta('meta[property="og:description"]', 'content', description)
    }
    return () => { document.title = prevTitle || DEFAULT_TITLE }
  }, [title, description])
}
