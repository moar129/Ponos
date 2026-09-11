// src/lib/richText.ts
// Helpers for the rich text stored in fields like news.description.
//
// The content is authored in RichTextEditor (contentEditable) and rendered
// with dangerouslySetInnerHTML, so it MUST pass through sanitizeRichText
// first. Only privileged users can write it, but they write for every
// member of the organisation - an injected <script> would run in those
// members' browsers and could read their Supabase session, which would
// escalate past RLS.

// Tags the editor can produce. Everything else is unwrapped (its text is
// kept, the element itself is dropped).
const ALLOWED_TAGS = new Set([
    'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U',
    'UL', 'OL', 'LI', 'H2', 'H3', 'BLOCKQUOTE', 'A',
])

// Dropped including their content - unwrapping these would leak script
// source or styling rules as visible text.
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'NOSCRIPT'])

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

function parseBody(html: string): HTMLElement {
    return new DOMParser().parseFromString(html, 'text/html').body
}

// Replaces an element with its own children, keeping the text intact.
function unwrap(element: Element) {
    const parent = element.parentNode
    if (!parent) return
    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
    }
    parent.removeChild(element)
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

export function isSafeHref(value: string): boolean {
    try {
        return ALLOWED_PROTOCOLS.has(new URL(value, window.location.origin).protocol)
    } catch {
        return false
    }
}

function sanitizeElement(element: Element) {
    // Children are collected first: sanitizing mutates the live child list.
    const children = Array.from(element.children)

    if (DROPPED_TAGS.has(element.tagName)) {
        element.remove()
        return
    }

    if (!ALLOWED_TAGS.has(element.tagName)) {
        children.forEach(sanitizeElement)
        unwrap(element)
        return
    }

    const isLink = element.tagName === 'A'
    const href = isLink ? element.getAttribute('href') : null

    // Strips every attribute - including event handlers like onerror and
    // style, which is the whole point of the whitelist.
    for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name)
    }

    if (isLink) {
        if (href && isSafeHref(href)) {
            element.setAttribute('href', href)
        } else {
            // javascript:/data: links become plain text rather than disappearing.
            children.forEach(sanitizeElement)
            unwrap(element)
            return
        }
    }

    children.forEach(sanitizeElement)
}

export function sanitizeRichText(html: string): string {
    const body = parseBody(html)
    Array.from(body.children).forEach(sanitizeElement)
    return body.innerHTML
}

// True when the value contains markup, i.e. was written with the rich text
// editor. News created before the editor existed are plain text and are
// still rendered the old way (whitespace-pre-wrap).
export function isRichText(value: string): boolean {
    return /<[a-z][\s\S]*>/i.test(value)
}

// Plain text for the card/slider excerpts, which use line-clamp and would
// otherwise show raw tags.
export function richTextToPlainText(value: string): string {
    if (!isRichText(value)) return value

    // Block boundaries become spaces, so list items don't run together.
    const spaced = sanitizeRichText(value).replace(/<\/(p|li|h2|h3|blockquote|ul|ol)>|<br\s*\/?>/gi, ' ')
    const text = parseBody(spaced).textContent ?? ''
    return text.replace(/\s+/g, ' ').trim()
}

// Converts a legacy plain text value into markup the editor can hold, so
// opening an old item for editing doesn't silently collapse its line
// breaks. Already-formatted values are returned untouched.
export function plainTextToRichText(value: string): string {
    if (isRichText(value)) return value

    return escapeHtml(value)
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('')
}

// An "empty" contentEditable still reports markup such as <br> or
// <p><br></p> - without this check those would be saved as a description.
export function isEmptyRichText(value: string): boolean {
    if (!value.trim()) return true
    return !(parseBody(sanitizeRichText(value)).textContent ?? '').trim()
}
