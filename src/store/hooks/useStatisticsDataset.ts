// src/store/hooks/useStatisticsDataset.ts

import { useMemo, useState } from 'react'
import { useGetStatisticsSnapshotsQuery } from '../apis/statisticApi'

export interface StatisticsDataset {
    id: string
    label: string
    start: Date
    end: Date
}

export function useStatisticsDataset() {
    const { data: snapshots = [], isLoading, isError } =
        useGetStatisticsSnapshotsQuery()

    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
        null
    )

    const datasets = useMemo<StatisticsDataset[]>(() => {
        return snapshots.map((snapshot) => ({
            id: snapshot.id,
            label: new Date(snapshot.period_start).getFullYear().toString(),
            start: new Date(snapshot.period_start),
            end: new Date(snapshot.period_end),
        }))
    }, [snapshots])

    const selectedDataset = useMemo(() => {
        return (
            datasets.find(
                (dataset) => dataset.id === selectedDatasetId
            ) ?? null
        )
    }, [datasets, selectedDatasetId])

    const selectDataset = (id: string) => {
        setSelectedDatasetId(id)
    }

    return {
        datasets,
        selectedDataset,
        selectedDatasetId,
        selectDataset,
        isLoading,
        isError,
    }
}