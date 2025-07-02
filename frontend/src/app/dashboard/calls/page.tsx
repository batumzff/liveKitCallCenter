'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  PhoneIcon,
  PlayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  FunnelIcon,
  PlusIcon,
  PhoneArrowUpRightIcon,
  PhoneArrowDownLeftIcon
} from '@heroicons/react/24/outline'
import { callsApi, projectsApi } from '@/lib/api'
import { Call } from '@/types'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { SentimentIndicator } from '@/components/calls/SentimentIndicator'

interface CallFilters {
  project_id?: string
  call_status?: string
  call_type?: string
  contact_id?: string
  campaign_id?: string
}

export default function CallsPage() {
  const [filters, setFilters] = useState<CallFilters>({})
  const [isInitiateCallModalOpen, setIsInitiateCallModalOpen] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 50 })

  const queryClient = useQueryClient()

  // Fetch projects for filter dropdown
  const { data: projects } = useQuery(
    'projects',
    () => projectsApi.getAll().then(res => res.data),
    { staleTime: 5 * 60 * 1000 }
  )

  // Fetch calls
  const { data: calls, isLoading, refetch } = useQuery(
    ['calls', filters, pagination],
    () => {
      if (!filters.project_id) return []
      return callsApi.getAll(
        filters.project_id,
        {
          call_status: filters.call_status,
          call_type: filters.call_type,
          contact_id: filters.contact_id,
          campaign_id: filters.campaign_id
        },
        (pagination.page - 1) * pagination.limit,
        pagination.limit
      ).then(res => res.data)
    },
    { 
      enabled: !!filters.project_id,
      keepPreviousData: true 
    }
  )

  const handleFilterChange = (newFilters: Partial<CallFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const clearFilters = () => {
    setFilters({ project_id: filters.project_id }) // Keep project_id
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success'
      case 'answered': return 'badge-info'
      case 'failed': return 'badge-error'
      case 'no_answer': return 'badge-warning'
      case 'ringing': return 'badge-info'
      default: return 'badge-neutral'
    }
  }

  const getCallTypeIcon = (type: string) => {
    return type === 'outbound' ? PhoneArrowUpRightIcon : PhoneArrowDownLeftIcon
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleViewAnalysis = (call: Call) => {
    window.open(`/dashboard/calls/${call.id}/analysis`, '_blank')
  }

  const handlePlayRecording = (call: Call) => {
    if (call.recording_url) {
      window.open(call.recording_url, '_blank')
    }
  }

  const columns = [
    {
      key: 'phone_number',
      label: 'Contact',
      sortable: true,
      render: (value: string, row: Call) => {
        const TypeIcon = getCallTypeIcon(row.call_type)
        return (
          <div className="flex items-center space-x-2">
            <TypeIcon className={`h-4 w-4 ${
              row.call_type === 'outbound' ? 'text-blue-600' : 'text-green-600'
            }`} />
            <div>
              <div className="font-medium text-gray-900">{value}</div>
              <div className="text-sm text-gray-500 capitalize">{row.call_type}</div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'call_status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`badge ${getCallStatusColor(value)}`}>
          {value.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'duration_seconds',
      label: 'Duration',
      sortable: true,
      render: (value: number) => formatDuration(value)
    },
    {
      key: 'sentiment',
      label: 'Sentiment',
      render: (value: string, row: Call) => {
        if (!value) return <span className="text-gray-400 text-sm">N/A</span>
        return (
          <SentimentIndicator
            sentiment={value as 'positive' | 'negative' | 'neutral'}
            confidence={row.sentiment_score ? Math.abs(row.sentiment_score) : 0}
            size="sm"
            showLabel={false}
          />
        )
      }
    },
    {
      key: 'call_outcome',
      label: 'Outcome',
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-gray-400 text-sm">N/A</span>
        return (
          <span className="text-sm text-gray-900 capitalize">
            {value.replace('_', ' ')}
          </span>
        )
      }
    },
    {
      key: 'started_at',
      label: 'Started',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-gray-900">
          {formatTimestamp(value)}
        </div>
      )
    },
    {
      key: 'analysis_completed',
      label: 'Analysis',
      render: (value: boolean, row: Call) => (
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value ? 'Complete' : 'Pending'}
          </span>
          {row.transcript && (
            <DocumentTextIcon className="h-4 w-4 text-gray-400" title="Transcript available" />
          )}
          {row.recording_url && (
            <PlayIcon className="h-4 w-4 text-gray-400" title="Recording available" />
          )}
        </div>
      )
    }
  ]

  const actions = [
    {
      label: 'View Analysis',
      onClick: handleViewAnalysis,
      icon: ChartBarIcon
    },
    {
      label: 'Play Recording',
      onClick: handlePlayRecording,
      icon: PlayIcon
    }
  ]

  // Calculate stats
  const totalCalls = calls?.length || 0
  const completedCalls = calls?.filter(c => c.call_status === 'completed').length || 0
  const answeredCalls = calls?.filter(c => c.call_status === 'answered' || c.call_status === 'completed').length || 0
  const avgDuration = calls?.length ? 
    Math.round(calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / calls.length) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-heading-2">Calls</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monitor and manage all your call center calls
          </p>
        </div>
        <button
          onClick={() => setIsInitiateCallModalOpen(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Initiate Call
        </button>
      </div>

      {/* Project Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
              Select Project
            </label>
            <select
              id="project"
              value={filters.project_id || ''}
              onChange={(e) => handleFilterChange({ project_id: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Choose a project...</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filters.project_id && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <PhoneIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Calls</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCalls}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Answered</p>
                  <p className="text-2xl font-bold text-gray-900">{answeredCalls}</p>
                  <p className="text-xs text-gray-500">
                    {totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0}% rate
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 font-bold">⏱</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(avgDuration)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">🎯</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedCalls}</p>
                  <p className="text-xs text-gray-500">
                    {totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0}% rate
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Call Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Status
                </label>
                <select
                  value={filters.call_status || ''}
                  onChange={(e) => handleFilterChange({ call_status: e.target.value || undefined })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All statuses</option>
                  <option value="initiated">Initiated</option>
                  <option value="ringing">Ringing</option>
                  <option value="answered">Answered</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="no_answer">No Answer</option>
                </select>
              </div>

              {/* Call Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Type
                </label>
                <select
                  value={filters.call_type || ''}
                  onChange={(e) => handleFilterChange({ call_type: e.target.value || undefined })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All types</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Calls Table */}
          <DataTable
            data={calls || []}
            columns={columns}
            loading={isLoading}
            actions={actions}
            searchable
            emptyMessage="No calls found for the selected project and filters."
            pagination={{
              page: pagination.page,
              limit: pagination.limit,
              total: calls?.length || 0,
              onPageChange: (page) => setPagination(prev => ({ ...prev, page }))
            }}
          />
        </>
      )}

      {!filters.project_id && (
        <div className="text-center py-12">
          <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a project</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a project to view and manage calls.
          </p>
        </div>
      )}

      {/* Initiate Call Modal */}
      <Modal
        isOpen={isInitiateCallModalOpen}
        onClose={() => setIsInitiateCallModalOpen(false)}
        title="Initiate Outbound Call"
        size="lg"
      >
        <div className="text-center py-8">
          <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Call initiation coming soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            This feature will allow you to initiate outbound calls directly from the dashboard.
          </p>
        </div>
      </Modal>
    </div>
  )
}