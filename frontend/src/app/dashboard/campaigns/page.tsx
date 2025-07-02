'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  MegaphoneIcon,
  UserGroupIcon,
  PhoneIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { campaignsApi, projectsApi, agentsApi } from '@/lib/api'
import { Campaign } from '@/types'
import { DataTable } from '@/components/ui/DataTable'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { CampaignForm } from '@/components/campaigns/CampaignForm'

interface CampaignFilters {
  project_id?: string
  status?: string
  campaign_type?: string
}

export default function CampaignsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [filters, setFilters] = useState<CampaignFilters>({})
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })

  const queryClient = useQueryClient()

  // Fetch projects for filter dropdown
  const { data: projects } = useQuery(
    'projects',
    () => projectsApi.getAll().then(res => res.data),
    { staleTime: 5 * 60 * 1000 }
  )

  // Fetch agents for the form
  const { data: agents } = useQuery(
    'agents',
    () => agentsApi.getAll().then(res => res.data),
    { staleTime: 5 * 60 * 1000 }
  )

  const { data: campaigns, isLoading, refetch } = useQuery(
    ['campaigns', filters, pagination],
    () => {
      if (!filters.project_id) return []
      return campaignsApi.getAll(
        filters.project_id,
        {
          status: filters.status,
          campaign_type: filters.campaign_type
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

  const createMutation = useMutation(campaignsApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('campaigns')
      setIsCreateModalOpen(false)
    }
  })

  const updateMutation = useMutation(
    ({ id, data }: { id: string, data: any }) => campaignsApi.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('campaigns')
        setIsEditModalOpen(false)
        setSelectedCampaign(null)
      }
    }
  )

  const deleteMutation = useMutation(campaignsApi.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('campaigns')
      setIsDeleteModalOpen(false)
      setSelectedCampaign(null)
    }
  })

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setIsEditModalOpen(true)
  }

  const handleDelete = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setIsDeleteModalOpen(true)
  }

  const handleStart = (campaign: Campaign) => {
    updateMutation.mutate({ id: campaign.id, data: { status: 'active' } })
  }

  const handlePause = (campaign: Campaign) => {
    updateMutation.mutate({ id: campaign.id, data: { status: 'paused' } })
  }

  const handleStop = (campaign: Campaign) => {
    updateMutation.mutate({ id: campaign.id, data: { status: 'stopped' } })
  }

  const handleViewAnalytics = (campaign: Campaign) => {
    window.open(`/dashboard/campaigns/${campaign.id}/analytics`, '_blank')
  }

  const handleFilterChange = (newFilters: Partial<CampaignFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ project_id: filters.project_id })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'stopped': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return PlayIcon
      case 'paused': return PauseIcon
      case 'stopped': return StopIcon
      default: return MegaphoneIcon
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const columns = [
    {
      key: 'name',
      label: 'Campaign',
      sortable: true,
      render: (value: string, row: Campaign) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500 capitalize">{row.campaign_type.replace('_', ' ')}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string, row: Campaign) => {
        const StatusIcon = getStatusIcon(value)
        return (
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
              {value.toUpperCase()}
            </span>
            <StatusIcon className="h-4 w-4 text-gray-400" />
          </div>
        )
      }
    },
    {
      key: 'agent_id',
      label: 'Agent',
      render: (value: string) => {
        const agent = agents?.find(a => a.id === value)
        return (
          <div className="text-sm text-gray-900">
            {agent ? agent.name : 'No Agent Assigned'}
          </div>
        )
      }
    },
    {
      key: 'total_contacts',
      label: 'Contacts',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <UserGroupIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-900">{value || 0}</span>
        </div>
      )
    },
    {
      key: 'calls_made',
      label: 'Calls Made',
      sortable: true,
      render: (value: number, row: Campaign) => (
        <div className="text-sm text-gray-900">
          {value || 0} / {row.total_contacts || 0}
          {row.total_contacts > 0 && (
            <div className="text-xs text-gray-500">
              {Math.round(((value || 0) / row.total_contacts) * 100)}% complete
            </div>
          )}
        </div>
      )
    },
    {
      key: 'success_rate',
      label: 'Success Rate',
      sortable: true,
      render: (value: number) => (
        <div className="text-sm text-gray-900">
          {value ? `${Math.round(value * 100)}%` : 'N/A'}
        </div>
      )
    },
    {
      key: 'start_date',
      label: 'Start Date',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-gray-900">
          {value ? formatDate(value) : 'Not scheduled'}
        </div>
      )
    }
  ]

  const getActionsForCampaign = (campaign: Campaign) => {
    const baseActions = [
      {
        label: 'View Analytics',
        onClick: handleViewAnalytics,
        icon: ChartBarIcon
      },
      {
        label: 'Edit',
        onClick: handleEdit,
        icon: PencilIcon
      }
    ]

    // Add status-specific actions
    if (campaign.status === 'draft' || campaign.status === 'stopped') {
      baseActions.unshift({
        label: 'Start Campaign',
        onClick: handleStart,
        icon: PlayIcon
      })
    } else if (campaign.status === 'active') {
      baseActions.unshift({
        label: 'Pause Campaign',
        onClick: handlePause,
        icon: PauseIcon
      })
    } else if (campaign.status === 'paused') {
      baseActions.unshift({
        label: 'Resume Campaign',
        onClick: handleStart,
        icon: PlayIcon
      })
      baseActions.push({
        label: 'Stop Campaign',
        onClick: handleStop,
        icon: StopIcon
      })
    }

    if (campaign.status !== 'active') {
      baseActions.push({
        label: 'Delete',
        onClick: handleDelete,
        icon: TrashIcon
      })
    }

    return baseActions
  }

  // Calculate stats
  const totalCampaigns = campaigns?.length || 0
  const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0
  const totalCalls = campaigns?.reduce((sum, c) => sum + (c.calls_made || 0), 0) || 0
  const avgSuccessRate = campaigns?.length 
    ? Math.round(campaigns.reduce((sum, c) => sum + (c.success_rate || 0), 0) / campaigns.length * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage your call center campaigns
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Campaign
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
                <MegaphoneIcon className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <PlayIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCampaigns}</p>
                  <p className="text-xs text-gray-500">Currently running</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PhoneIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Calls</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCalls}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">%</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Success</p>
                  <p className="text-2xl font-bold text-gray-900">{avgSuccessRate}%</p>
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
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="stopped">Stopped</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Campaign Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Type
                </label>
                <select
                  value={filters.campaign_type || ''}
                  onChange={(e) => handleFilterChange({ campaign_type: e.target.value || undefined })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All types</option>
                  <option value="outbound_sales">Outbound Sales</option>
                  <option value="lead_qualification">Lead Qualification</option>
                  <option value="customer_survey">Customer Survey</option>
                  <option value="appointment_booking">Appointment Booking</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <MegaphoneIcon className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Campaigns Table */}
          <DataTable
            data={campaigns || []}
            columns={columns}
            loading={isLoading}
            actions={campaigns?.length > 0 ? getActionsForCampaign(campaigns[0]) : []}
            searchable
            emptyMessage="No campaigns found for the selected project and filters."
            pagination={{
              page: pagination.page,
              limit: pagination.limit,
              total: campaigns?.length || 0,
              onPageChange: (page) => setPagination(prev => ({ ...prev, page }))
            }}
          />
        </>
      )}

      {!filters.project_id && (
        <div className="text-center py-12">
          <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a project</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a project to view and manage campaigns.
          </p>
        </div>
      )}

      {/* Create Campaign Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Campaign"
        size="xl"
      >
        <CampaignForm
          projects={projects || []}
          agents={agents || []}
          selectedProjectId={filters.project_id}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={createMutation.isLoading}
        />
      </Modal>

      {/* Edit Campaign Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedCampaign(null)
        }}
        title="Edit Campaign"
        size="xl"
      >
        {selectedCampaign && (
          <CampaignForm
            initialData={selectedCampaign}
            projects={projects || []}
            agents={agents || []}
            selectedProjectId={filters.project_id}
            onSubmit={(data) => updateMutation.mutate({ id: selectedCampaign.id, data })}
            onCancel={() => {
              setIsEditModalOpen(false)
              setSelectedCampaign(null)
            }}
            loading={updateMutation.isLoading}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedCampaign(null)
        }}
        onConfirm={() => selectedCampaign && deleteMutation.mutate(selectedCampaign.id)}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${selectedCampaign?.name}"? This action cannot be undone and will stop all related calls.`}
        confirmLabel="Delete"
        type="danger"
        loading={deleteMutation.isLoading}
      />
    </div>
  )
}