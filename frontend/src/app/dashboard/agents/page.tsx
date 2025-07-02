'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  PlayIcon,
  StopIcon,
  CpuChipIcon,
  SignalIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { agentsApi, projectsApi } from '@/lib/api'
import { Agent } from '@/types'
import { DataTable } from '@/components/ui/DataTable'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { AgentForm } from '@/components/agents/AgentForm'

export default function AgentsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })

  const queryClient = useQueryClient()

  // Fetch projects for filter dropdown
  const { data: projects } = useQuery(
    'projects',
    () => projectsApi.getAll().then(res => res.data),
    { staleTime: 5 * 60 * 1000 }
  )

  const { data: agents, isLoading } = useQuery(
    ['agents', pagination],
    () => agentsApi.getAll((pagination.page - 1) * pagination.limit, pagination.limit)
      .then(res => res.data),
    { keepPreviousData: true }
  )

  const createMutation = useMutation(agentsApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('agents')
      setIsCreateModalOpen(false)
    }
  })

  const updateMutation = useMutation(
    ({ id, data }: { id: string, data: any }) => agentsApi.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agents')
        setIsEditModalOpen(false)
        setSelectedAgent(null)
      }
    }
  )

  const deleteMutation = useMutation(agentsApi.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('agents')
      setIsDeleteModalOpen(false)
      setSelectedAgent(null)
    }
  })

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent)
    setIsEditModalOpen(true)
  }

  const handleDelete = (agent: Agent) => {
    setSelectedAgent(agent)
    setIsDeleteModalOpen(true)
  }

  const handleTest = (agent: Agent) => {
    window.open(`/dashboard/agents/${agent.id}/test`, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'testing': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return SignalIcon
      case 'inactive': return StopIcon
      case 'error': return ExclamationTriangleIcon
      case 'testing': return PlayIcon
      default: return CpuChipIcon
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Agent Name',
      sortable: true,
      render: (value: string, row: Agent) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">
            {projects?.find(p => p.id === row.project_id)?.name || 'Unknown Project'}
          </div>
        </div>
      )
    },
    {
      key: 'agent_type',
      label: 'Type',
      sortable: true,
      render: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {value.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'model',
      label: 'AI Model',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <CpuChipIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-900">{value}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string, row: Agent) => {
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
      key: 'voice',
      label: 'Voice',
      render: (value: string) => (
        <span className="text-sm text-gray-900 capitalize">{value}</span>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ]

  const actions = [
    {
      label: 'Test Agent',
      onClick: handleTest,
      icon: PlayIcon
    },
    {
      label: 'Edit',
      onClick: handleEdit,
      icon: PencilIcon
    },
    {
      label: 'Delete',
      onClick: handleDelete,
      icon: TrashIcon
    }
  ]

  // Calculate stats
  const totalAgents = agents?.length || 0
  const activeAgents = agents?.filter(a => a.status === 'active').length || 0
  const inactiveAgents = agents?.filter(a => a.status === 'inactive').length || 0
  const errorAgents = agents?.filter(a => a.status === 'error').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure and manage your AI agents for call center operations
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Agent
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <CpuChipIcon className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">{totalAgents}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <SignalIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{activeAgents}</p>
              <p className="text-xs text-gray-500">
                {totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0}% of total
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <StopIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-900">{inactiveAgents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-gray-900">{errorAgents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Configuration Tips */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CpuChipIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">AI Agent Configuration</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Choose appropriate AI models based on your use case (GPT-4o-mini for most scenarios)</li>
                <li>Configure system prompts to match your business requirements</li>
                <li>Test agents thoroughly before deploying to production campaigns</li>
                <li>Monitor agent performance and adjust configurations as needed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <DataTable
        data={agents || []}
        columns={columns}
        loading={isLoading}
        actions={actions}
        searchable
        emptyMessage="No agents found. Create your first AI agent to get started."
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: agents?.length || 0,
          onPageChange: (page) => setPagination(prev => ({ ...prev, page }))
        }}
      />

      {/* Create Agent Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New AI Agent"
        size="xl"
      >
        <AgentForm
          projects={projects || []}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={createMutation.isLoading}
        />
      </Modal>

      {/* Edit Agent Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedAgent(null)
        }}
        title="Edit AI Agent"
        size="xl"
      >
        {selectedAgent && (
          <AgentForm
            initialData={selectedAgent}
            projects={projects || []}
            onSubmit={(data) => updateMutation.mutate({ id: selectedAgent.id, data })}
            onCancel={() => {
              setIsEditModalOpen(false)
              setSelectedAgent(null)
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
          setSelectedAgent(null)
        }}
        onConfirm={() => selectedAgent && deleteMutation.mutate(selectedAgent.id)}
        title="Delete AI Agent"
        message={`Are you sure you want to delete "${selectedAgent?.name}"? This action cannot be undone and may affect ongoing campaigns.`}
        confirmLabel="Delete"
        type="danger"
        loading={deleteMutation.isLoading}
      />
    </div>
  )
}