export interface RichTextEditorProps {
    // HTML string. Sanitize with sanitizeRichText before persisting it.
    value: string
    onChange: (html: string) => void
    // Connects a <label htmlFor=...> to the editable area.
    id?: string
    placeholder?: string
}
