// src/components/TextEditor/RichTextEditor.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent, MouseEvent } from 'react'
import { Bold, Indent, Italic, Link2, List, ListOrdered, Outdent, Underline, X } from 'lucide-react'
import { escapeHtml, isSafeHref, sanitizeRichText } from '../../lib/richText'
import type { RichTextEditorProps } from '../../types/textEditor/textEditorType'

// Generic WYSIWYG editor - deliberately knows nothing about news, so other
// features can reuse it. The value is an HTML string; the caller is
// responsible for running sanitizeRichText before persisting it.
//
// document.execCommand is formally deprecated but is still supported in
// every current browser, and is the only way to get WYSIWYG editing
// without pulling in an editor library (this repo has none).

type BlockTag = 'p' | 'h2' | 'h3'

interface LinkDraft {
    text: string
    url: string
}

// Kommandoer hvis aktive tilstand kan aflæses med queryCommandState og
// derfor kan fremhæves i værktøjslinjen.
const INLINE_COMMANDS = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'] as const

function normaliseUrl(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ''
    // A bare "dr.dk" is what people actually type - assume https.
    return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function RichTextEditor({ value, onChange, id, placeholder }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [activeCommands, setActiveCommands] = useState<Set<string>>(new Set())
    const [blockTag, setBlockTag] = useState<BlockTag>('p')
    const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null)
    const linkTextRef = useRef<HTMLInputElement>(null)
    // Typografi-dropdownen og link-feltet tager fokus fra skrivefladen, og
    // markeringen går tabt. Den sidste markering inde i editoren gemmes
    // derfor og genskabes, før en kommando køres.
    const savedRangeRef = useRef<Range | null>(null)

    // Only write to the DOM when the incoming value differs from what is
    // already there - assigning innerHTML on every keystroke would reset
    // the caret to the start of the field.
    useEffect(() => {
        const el = editorRef.current
        if (el && el.innerHTML !== value) {
            el.innerHTML = value
        }
    }, [value])

    const syncToolbarState = useCallback(() => {
        const el = editorRef.current
        const selection = document.getSelection()
        if (!el || !el.contains(selection?.anchorNode ?? null)) return

        if (selection && selection.rangeCount > 0) {
            savedRangeRef.current = selection.getRangeAt(0).cloneRange()
        }

        const active = new Set<string>()
        for (const command of INLINE_COMMANDS) {
            if (document.queryCommandState(command)) active.add(command)
        }
        setActiveCommands(active)

        const current = document.queryCommandValue('formatBlock').toLowerCase()
        setBlockTag(current === 'h2' || current === 'h3' ? current : 'p')
    }, [])

    useEffect(() => {
        document.addEventListener('selectionchange', syncToolbarState)
        return () => document.removeEventListener('selectionchange', syncToolbarState)
    }, [syncToolbarState])

    const isLinkPanelOpen = linkDraft !== null
    useEffect(() => {
        if (isLinkPanelOpen) linkTextRef.current?.focus()
    }, [isLinkPanelOpen])

    function run(command: string, argument?: string) {
        const el = editorRef.current
        el?.focus()

        // Markeringen genskabes ALTID fra den gemte range. focus() placerer
        // selv markøren i starten af feltet, når fokus har været i
        // dropdownen eller linkfeltet - uden dette ville kommandoen ramme
        // begyndelsen af teksten i stedet for der, hvor brugeren stod.
        const selection = document.getSelection()
        const range = savedRangeRef.current
        if (el && range && selection) {
            try {
                selection.removeAllRanges()
                selection.addRange(range)
            } catch {
                // Range'en kan pege på noder, der er erstattet af en tidligere
                // kommando - så bruges den nuværende markering i stedet.
            }
        }

        document.execCommand(command, false, argument)
        onChange(editorRef.current?.innerHTML ?? '')
        syncToolbarState()
    }

    function handleLinkKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault()
            applyLink()
        }
        if (e.key === 'Escape') setLinkDraft(null)
    }

    // Linket under markøren, hvis der er et - bruges til at forudfylde
    // felterne, så et eksisterende link kan rettes i stedet for at skulle
    // slettes og skrives forfra.
    function anchorAtSelection(): HTMLAnchorElement | null {
        const range = savedRangeRef.current
        const el = editorRef.current
        if (!range || !el) return null

        const node = range.startContainer
        const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
        const anchor = element?.closest('a')
        return anchor && el.contains(anchor) ? (anchor as HTMLAnchorElement) : null
    }

    function openLinkPanel() {
        if (linkDraft !== null) {
            setLinkDraft(null)
            return
        }

        const selection = document.getSelection()
        const selectedText = selection && !selection.isCollapsed ? selection.toString() : ''
        const anchor = anchorAtSelection()

        setLinkDraft({
            text: selectedText || anchor?.textContent || '',
            url: anchor?.getAttribute('href') ?? '',
        })
    }

    function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
        // Pasting from Word or a website otherwise drags in a mountain of
        // <span style>/<o:p> markup that the sanitizer would strip on save
        // anyway - strip it up front so what you see is what gets stored.
        e.preventDefault()
        const html = e.clipboardData.getData('text/html')
        if (html) {
            run('insertHTML', sanitizeRichText(html))
        } else {
            run('insertText', e.clipboardData.getData('text/plain'))
        }
    }

    function applyLink() {
        if (!linkDraft) return

        const url = normaliseUrl(linkDraft.url)
        if (!url || !isSafeHref(url)) {
            setLinkDraft(null)
            return
        }

        // Står markøren blot inde i et eksisterende link, markeres hele
        // linket, så det erstattes frem for at få et link indlejret i sig.
        const anchor = anchorAtSelection()
        if (anchor && savedRangeRef.current?.collapsed) {
            const range = document.createRange()
            range.selectNode(anchor)
            savedRangeRef.current = range
        }

        // Teksten er brugerens egen, så linket kan hedde noget andet end
        // selve adressen. Tom tekst falder tilbage til adressen.
        const text = linkDraft.text.trim() || url
        run('insertHTML', `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`)
        setLinkDraft(null)
    }

    // Holder markeringen i live når en knap trykkes - uden dette mister
    // skrivefladen fokus, og kommandoen rammer ingenting.
    const preventBlur = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault()

    const buttonClass = (isActive: boolean) =>
        `p-1.5 rounded-md transition-colors ${
            isActive ? 'bg-bg-gray text-primary' : 'text-secondary hover:text-primary hover:bg-bg-gray'
        }`

    return (
        <div className="rounded-md border border-border-gray focus-within:ring-2 focus-within:ring-accent">
            <div className="flex flex-wrap items-center gap-1 border-b border-border-gray px-2 py-1.5">
                {/* Dropdownen må IKKE have preventDefault på mousedown - det
                    forhindrer den i at åbne i Chrome. Markeringen genskabes i
                    stedet fra savedRangeRef inde i run(). */}
                <select
                    value={blockTag}
                    onChange={(e) => run('formatBlock', `<${e.target.value}>`)}
                    aria-label="Typografi"
                    className="text-sm text-secondary bg-transparent rounded-md px-1 py-1 hover:bg-bg-gray focus:outline-none"
                >
                    <option value="p">Normal</option>
                    <option value="h2">Overskrift</option>
                    <option value="h3">Underoverskrift</option>
                </select>

                <span className="w-px h-5 bg-border-gray mx-1" />

                <button type="button" onMouseDown={preventBlur} onClick={() => run('bold')} aria-label="Fed" aria-pressed={activeCommands.has('bold')} className={buttonClass(activeCommands.has('bold'))}>
                    <Bold className="w-4 h-4" />
                </button>
                <button type="button" onMouseDown={preventBlur} onClick={() => run('italic')} aria-label="Kursiv" aria-pressed={activeCommands.has('italic')} className={buttonClass(activeCommands.has('italic'))}>
                    <Italic className="w-4 h-4" />
                </button>
                <button type="button" onMouseDown={preventBlur} onClick={() => run('underline')} aria-label="Understreget" aria-pressed={activeCommands.has('underline')} className={buttonClass(activeCommands.has('underline'))}>
                    <Underline className="w-4 h-4" />
                </button>

                <span className="w-px h-5 bg-border-gray mx-1" />

                <button type="button" onMouseDown={preventBlur} onClick={() => run('insertUnorderedList')} aria-label="Punktopstilling" aria-pressed={activeCommands.has('insertUnorderedList')} className={buttonClass(activeCommands.has('insertUnorderedList'))}>
                    <List className="w-4 h-4" />
                </button>
                <button type="button" onMouseDown={preventBlur} onClick={() => run('insertOrderedList')} aria-label="Nummereret liste" aria-pressed={activeCommands.has('insertOrderedList')} className={buttonClass(activeCommands.has('insertOrderedList'))}>
                    <ListOrdered className="w-4 h-4" />
                </button>

                <span className="w-px h-5 bg-border-gray mx-1" />

                <button type="button" onMouseDown={preventBlur} onClick={() => run('outdent')} aria-label="Ryk ud" className={buttonClass(false)}>
                    <Outdent className="w-4 h-4" />
                </button>
                <button type="button" onMouseDown={preventBlur} onClick={() => run('indent')} aria-label="Ryk ind" className={buttonClass(false)}>
                    <Indent className="w-4 h-4" />
                </button>

                <span className="w-px h-5 bg-border-gray mx-1" />

                <button type="button" onMouseDown={preventBlur} onClick={openLinkPanel} aria-label="Indsæt link" aria-pressed={linkDraft !== null} className={buttonClass(linkDraft !== null)}>
                    <Link2 className="w-4 h-4" />
                </button>
            </div>

            {/* Inline link-række frem for window.prompt, som er blokeret i
                nogle browsere og bryder med appens øvrige inline-paneler. */}
            {linkDraft !== null && (
                <div className="flex flex-wrap items-center gap-2 border-b border-border-gray px-2 py-2 bg-bg-gray/40">
                    <input
                        ref={linkTextRef}
                        type="text"
                        value={linkDraft.text}
                        onChange={(e) => setLinkDraft({ ...linkDraft, text: e.target.value })}
                        onKeyDown={handleLinkKeyDown}
                        placeholder="Tekst der vises"
                        aria-label="Linkets tekst"
                        className="flex-1 min-w-40 rounded-md border border-border-gray px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                        type="text"
                        value={linkDraft.url}
                        onChange={(e) => setLinkDraft({ ...linkDraft, url: e.target.value })}
                        onKeyDown={handleLinkKeyDown}
                        placeholder="https://..."
                        aria-label="Linkets adresse"
                        className="flex-1 min-w-40 rounded-md border border-border-gray px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button
                        type="button"
                        onClick={applyLink}
                        className="text-sm font-medium text-primary hover:underline shrink-0"
                    >
                        Indsæt
                    </button>
                    <button
                        type="button"
                        onClick={() => setLinkDraft(null)}
                        aria-label="Annuller link"
                        className="p-1 rounded-md text-secondary hover:text-primary hover:bg-bg-gray transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div
                id={id}
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                data-placeholder={placeholder}
                onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
                onPaste={handlePaste}
                onKeyUp={syncToolbarState}
                onMouseUp={syncToolbarState}
                className="rich-text min-h-40 max-h-96 overflow-y-auto px-3 py-2 focus:outline-none"
            />
        </div>
    )
}
