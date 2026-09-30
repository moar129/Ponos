// src/utils/locationForm.ts
import type { LocationFormValues } from '../types/dataLayer/datalayerTypes'

export const EMPTY_LOCATION_FORM: LocationFormValues = { name: '', address: '', description: '' }

/** Trimmede værdier klar til add/updateLocation - tomme valgfrie felter bliver null. */
export function toLocationPayload(values: LocationFormValues) {
  return {
    name: values.name.trim(),
    address: values.address.trim() || null,
    description: values.description.trim() || null,
  }
}
