'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { projectsApi } from '@/lib/api'
import { Project } from '@/types'
import { DataTable } from '@/components/ui/DataTable'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/projects/ProjectForm'

export default function ProjectsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })

  const queryClient = useQueryClient()

  const { data: projects, isLoading } = useQuery(
    ['projects', pagination],
    () => projectsApi.getAll((pagination.page - 1) * pagination.limit, pagination.limit)
      .then(res => res.data),
    { keepPreviousData: true }
  )

  const createMutation = useMutation(projectsApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('projects')
      setIsCreateModalOpen(false)
    }
  })

  const updateMutation = useMutation(
    ({ id, data }: { id: string, data: any }) => projectsApi.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects')
        setIsEditModalOpen(false)
        setSelectedProject(null)
      }
    }
  )

  const deleteMutation = useMutation(projectsApi.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('projects')
      setIsDeleteModalOpen(false)
      setSelectedProject(null)
    }
  })

  const handleEdit = (project: Project) => {
    setSelectedProject(project)
    setIsEditModalOpen(true)
  }

  const handleDelete = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteModalOpen(true)
  }

  const handleView = (project: Project) => {
    window.open(`/dashboard/projects/${project.id}`, '_blank')
  }

  const columns = [
    {
      key: 'name',
      label: 'Project Name',
      sortable: true,
      render: (value: string, row: Project) => (
        <div>
          <div className="font-medium text-text-primary">{value}</div>
          {row.description && (
            <div className="text-sm text-text-tertiary truncate max-w-xs">
              {row.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'created_by',
      label: 'Created By',
      sortable: true,
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span className={`badge ${
          value ? 'badge-success' : 'badge-error'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ]

  const actions = [
    {
      label: 'View',
      onClick: handleView,
      icon: EyeIcon
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-heading-2">Projects</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your call center projects and organize your campaigns
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Project
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="flex items-center">
            <Cog6ToothIcon className="stats-card-icon text-primary-600" />
            <div className="stats-card-content">
              <p className="stats-card-label">Total Projects</p>
              <p className="stats-card-value">{projects?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center">
            <div className="stats-card-icon bg-success-100 rounded-lg flex items-center justify-center">
              <span className="text-success-600 font-bold">✓</span>
            </div>
            <div className="stats-card-content">
              <p className="stats-card-label">Active Projects</p>
              <p className="stats-card-value">
                {projects?.filter(p => p.is_active).length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold">📞</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {projects?.filter(p => {
                  const created = new Date(p.created_at)
                  const thisMonth = new Date()
                  return created.getMonth() === thisMonth.getMonth() && 
                         created.getFullYear() === thisMonth.getFullYear()
                }).length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 font-bold">⏸</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-900">
                {projects?.filter(p => !p.is_active).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <DataTable
        data={projects || []}
        columns={columns}
        loading={isLoading}
        actions={actions}
        searchable
        emptyMessage="No projects found. Create your first project to get started."
      />

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
        size="lg"
      >
        <ProjectForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={createMutation.isLoading}
        />
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedProject(null)
        }}
        title="Edit Project"
        size="lg"
      >
        {selectedProject && (
          <ProjectForm
            initialData={selectedProject}
            onSubmit={(data) => updateMutation.mutate({ id: selectedProject.id, data })}
            onCancel={() => {
              setIsEditModalOpen(false)
              setSelectedProject(null)
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
          setSelectedProject(null)
        }}
        onConfirm={() => selectedProject && deleteMutation.mutate(selectedProject.id)}
        title="Delete Project"
        message={`Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone and will also delete all associated campaigns, calls, and data.`}
        confirmLabel="Delete"
        type="danger"
        loading={deleteMutation.isLoading}
      />
    </div>
  )
}