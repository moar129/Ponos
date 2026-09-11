// src/components/News/NewsFormModal.tsx
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { useCreateNewsMutation, useUpdateNewsMutation } from '../../store/apis/newsApi'
import { RichTextEditor } from '../TextEditor/RichTextEditor'
import { isEmptyRichText, plainTextToRichText, richTextToPlainText, sanitizeRichText } from '../../lib/richText'
import type { NewsFormModalProps } from '../../types/news/newsType'

// Blødt loft, kun for at fange et utilsigtet indsat kæmpedokument -
// ikke en forretningsregel, og derfor heller ingen DB-constraint.
const MAX_DESCRIPTION_LENGTH = 20000

interface FormState {
    title: string
    description: string
    pictureUrl: string
    url: string
}

const emptyForm: FormState = { title: '', description: '', pictureUrl: '', url: '' }

// Opret- og rediger-nyhed i samme modal - editingNews === null betyder
// opret, ellers redigeres den givne nyhed (samme mønster som andre
// modaler i appen, fx EditTaskModal/CreateTaskModal er adskilt, men her
// er felterne identiske nok til at dele én komponent).
export function NewsFormModal({ isOpen, onClose, editingNews }: NewsFormModalProps) {
    const [createNews, { isLoading: creating, error: createError }] = useCreateNewsMutation()
    const [updateNews, { isLoading: updating, error: updateError }] = useUpdateNewsMutation()

    const [form, setForm] = useState<FormState>(emptyForm)
    const [validationError, setValidationError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        setValidationError(null)
        setForm(
            editingNews
                ? {
                      title: editingNews.title,
                      // Nyheder fra før editoren er ren tekst - konverteres, så
                      // deres linjeskift ikke forsvinder i contentEditable.
                      description: plainTextToRichText(editingNews.description ?? ''),
                      pictureUrl: editingNews.pictureUrl ?? '',
                      url: editingNews.url ?? '',
                  }
                : emptyForm,
        )
    }, [isOpen, editingNews])

    if (!isOpen) return null

    const isSaving = creating || updating
    const mutationError = editingNews ? updateError : createError
    const errorMessage =
        validationError ??
        (mutationError && typeof mutationError === 'object' && 'error' in mutationError && typeof mutationError.error === 'string'
            ? mutationError.error
            : null)

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!form.title.trim()) {
            setValidationError('Nyhedens titel skal udfyldes.')
            return
        }

        const isDescriptionEmpty = isEmptyRichText(form.description)
        if (!isDescriptionEmpty && richTextToPlainText(form.description).length > MAX_DESCRIPTION_LENGTH) {
            setValidationError(`Beskrivelsen er for lang (maks. ${MAX_DESCRIPTION_LENGTH.toLocaleString('da-DK')} tegn).`)
            return
        }
        setValidationError(null)

        const payload = {
            title: form.title.trim(),
            description: isDescriptionEmpty ? null : sanitizeRichText(form.description),
            pictureUrl: form.pictureUrl.trim() || null,
            url: form.url.trim() || null,
        }

        try {
            if (editingNews) {
                await updateNews({ id: editingNews.id, ...payload }).unwrap()
            } else {
                await createNews(payload).unwrap()
            }
            onClose()
        } catch {
            // Fejlen vises via mutationError - modalen forbliver åben.
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 relative">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Luk"
                    className="absolute right-4 top-4 text-secondary hover:text-primary p-1 rounded-md hover:bg-bg-gray transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-semibold text-primary mb-4">
                    {editingNews ? 'Rediger nyhed' : 'Opret nyhed'}
                </h2>

                {errorMessage && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-secondary mb-1" htmlFor="news-title">Titel</label>
                        <input
                            id="news-title"
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-secondary mb-1" htmlFor="news-description">Beskrivelse</label>
                        <RichTextEditor
                            id="news-description"
                            value={form.description}
                            onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                            placeholder="Skriv nyheden her..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-secondary mb-1" htmlFor="news-picture">Billed-URL (valgfri)</label>
                        <input
                            id="news-picture"
                            type="text"
                            value={form.pictureUrl}
                            onChange={(e) => setForm((f) => ({ ...f, pictureUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-secondary mb-1" htmlFor="news-url">Link til oprindelig artikel (valgfri)</label>
                        <input
                            id="news-url"
                            type="text"
                            value={form.url}
                            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                            placeholder="https://..."
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <p className="text-xs text-secondary mt-1">Vises som "Læs hele artiklen" nederst på nyheden.</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                        >
                            {isSaving ? 'Gemmer...' : 'Gem'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-md border border-border-gray px-4 py-2 font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                        >
                            Annuller
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
