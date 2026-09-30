// src/components/dataLayer/warehouse/LocationFormModal.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Save } from 'lucide-react'
import { useAddLocationMutation, useUpdateLocationMutation } from '../../../store/apis/categoryApi'
import { getErrorMessage } from '../../../ErrorMessage'
import type { LocationFormModalProps, LocationFormValues } from '../../../types/dataLayer/datalayerTypes'
import { Alert } from '../../common/Alert'
import { Modal } from '../../common/Modal'
import { LocationFormFields } from './LocationFormFields'
import { EMPTY_LOCATION_FORM, toLocationPayload } from '../../../utils/locationForm'

// Opret eller rediger et lager/en sektion. Mountes kun mens den er åben,
// så felterne altid starter fra det rigtige udgangspunkt.
export function LocationFormModal({ onClose, parent = null, location, onCreated }: LocationFormModalProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const isEdit = location !== undefined
  const isSection = isEdit ? Boolean(location.parentLocationId) : parent !== null

  const [values, setValues] = useState<LocationFormValues>(() =>
    location
      ? { name: location.name, address: location.address ?? '', description: location.description ?? '' }
      : EMPTY_LOCATION_FORM,
  )
  const [error, setError] = useState<string | null>(null)
  const [addLocation, { isLoading: adding }] = useAddLocationMutation()
  const [updateLocation, { isLoading: updating }] = useUpdateLocationMutation()
  const isSaving = adding || updating

  async function handleSubmit() {
    if (!values.name.trim()) {
      setError(t('locations.nameRequired'))
      return
    }
    try {
      if (location) {
        await updateLocation({ id: location.id, ...toLocationPayload(values) }).unwrap()
      } else {
        const id = await addLocation({ ...toLocationPayload(values), parentLocationId: parent?.id ?? null }).unwrap()
        onCreated?.(id)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, t(isEdit ? 'locations.saveFailed' : 'locations.createFailed')))
    }
  }

  const title = isEdit
    ? isSection ? t('locations.editSectionHeading') : t('locations.editWarehouseHeading')
    : isSection ? t('locations.newSectionHeading') : t('locations.newWarehouseHeading')
  const SubmitIcon = isEdit ? Save : Plus

  return (
    <Modal
      onClose={onClose}
      title={title}
      subtitle={!isEdit && parent && (
        <>{t('locations.creatingSectionHint')} <span className="font-medium text-primary dark:text-slate-100">{parent.name}</span></>
      )}
      closeOnBackdrop={false}
      disableClose={isSaving}
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SubmitIcon className="w-3.5 h-3.5" />}
            {isEdit ? t('common:save') : t('common:create')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Alert>{error}</Alert>
        <LocationFormFields values={values} onChange={setValues} isSection={isSection} />
      </div>
    </Modal>
  )
}
