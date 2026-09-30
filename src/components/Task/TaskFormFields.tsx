// src/components/Task/TaskFormFields.tsx
import { useTranslation } from 'react-i18next'
import { useGetRoomsQuery } from '../../store/apis/taskApi'
import { ASSIGNEE_LIMIT_OPTIONS } from '../../utils/taskDisplay'
import type { TaskFormFieldsProps } from '../../types/Task/Task'
import { Alert } from '../common/Alert'
import { PrioritySelect } from './PrioritySelect'
import { RoomSelect } from './RoomSelect'
import { TASK_INPUT, TASK_INPUT_READONLY, TASK_LABEL } from './taskFormStyles'

// Titel, beskrivelse, (rum), datoer, prioritet og maks. antal tilmeldte -
// de felter opret og rediger opgave har til fælles. Startdatoen sættes ved
// oprettelse og kan ikke ændres.
export function TaskFormFields({ idPrefix, values, onChange, dateError }: TaskFormFieldsProps) {
    const { t } = useTranslation(['tasks', 'common'])
    const showRoom = values.roomId !== undefined
    const { data: rooms = [] } = useGetRoomsQuery(undefined, { skip: !showRoom })
    const id = (field: string) => `${idPrefix}-${field}`

    return (
        <>
            <div>
                <label htmlFor={id('title')} className={TASK_LABEL}>{t('common:title')}</label>
                <input
                    id={id('title')}
                    type="text"
                    value={values.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder={t('create.titlePlaceholder')}
                    className={TASK_INPUT}
                />
            </div>

            <div>
                <label htmlFor={id('description')} className={TASK_LABEL}>{t('common:description')}</label>
                <textarea
                    id={id('description')}
                    value={values.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder={t('create.descriptionPlaceholder')}
                    rows={5}
                    className={`resize-y break-words ${TASK_INPUT}`}
                />
            </div>

            {showRoom && (
                <div>
                    <label htmlFor={id('room')} className={TASK_LABEL}>{t('fields.room')}</label>
                    <RoomSelect
                        id={id('room')}
                        rooms={rooms}
                        value={values.roomId ?? ''}
                        onChange={(roomId) => onChange({ roomId: roomId || null })}
                    />
                </div>
            )}

            <Alert>{dateError}</Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor={id('start-date')} className={TASK_LABEL}>{t('fields.startDate')}</label>
                    <input id={id('start-date')} type="date" value={values.startDate} readOnly className={TASK_INPUT_READONLY} />
                </div>

                <div>
                    <label htmlFor={id('end-date')} className={TASK_LABEL}>{t('fields.endDate')}</label>
                    <input
                        id={id('end-date')}
                        type="date"
                        value={values.endDate}
                        min={values.startDate || undefined}
                        onChange={(e) => onChange({ endDate: e.target.value })}
                        className={TASK_INPUT}
                    />
                </div>
            </div>

            <div>
                <label htmlFor={id('priority')} className={TASK_LABEL}>{t('fields.priority')}</label>
                <PrioritySelect
                    id={id('priority')}
                    value={values.priority ?? ''}
                    emptyValue=""
                    emptyLabel={t('priorityNone')}
                    onChange={(priority) => onChange({ priority: priority || null })}
                    className={TASK_INPUT}
                />
            </div>

            <div>
                <label htmlFor={id('max-assignees')} className={TASK_LABEL}>{t('fields.maxAssignees')}</label>
                <select
                    id={id('max-assignees')}
                    value={values.maxAssignees ?? ''}
                    onChange={(e) => onChange({ maxAssignees: e.target.value === '' ? null : Number(e.target.value) })}
                    className={TASK_INPUT}
                >
                    <option value="">{t('assignees.noLimit')}</option>
                    {ASSIGNEE_LIMIT_OPTIONS.map((count) => (
                        <option key={count} value={count}>{t('assignees.count', { count })}</option>
                    ))}
                </select>
            </div>
        </>
    )
}
