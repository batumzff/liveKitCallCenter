'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  DocumentArrowUpIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { contactsApi, projectsApi } from '@/lib/api'
import { Contact } from '@/types'
import { DataTable } from '@/components/ui/DataTable'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { ContactForm } from '@/components/contacts/ContactForm'
import { ContactImport } from '@/components/contacts/ContactImport'

interface ContactFilters {
  project_id?: string
  status?: string
  tags?: string
}

export default function ContactsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [filters, setFilters] = useState<ContactFilters>({})
  const [pagination, setPagination] = useState({ page: 1, limit: 50 })

  const queryClient = useQueryClient()

  // Fetch projects for filter dropdown
  const { data: projects } = useQuery(
    'projects',
    () => projectsApi.getAll().then(res => res.data),
    { staleTime: 5 * 60 * 1000 }
  )

  const { data: contacts, isLoading, refetch } = useQuery(
    ['contacts', filters, pagination],
    () => {
      if (!filters.project_id) return []
      return contactsApi.getAll(
        filters.project_id,
        {
          status: filters.status,
          tags: filters.tags
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

  const createMutation = useMutation(contactsApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('contacts')
      setIsCreateModalOpen(false)
    }
  })

  const updateMutation = useMutation(
    ({ id, data }: { id: string, data: any }) => contactsApi.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contacts')
        setIsEditModalOpen(false)
        setSelectedContact(null)
      }
    }
  )

  const deleteMutation = useMutation(contactsApi.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('contacts')
      setIsDeleteModalOpen(false)
      setSelectedContact(null)
    }
  })

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact)
    setIsEditModalOpen(true)
  }

  const handleDelete = (contact: Contact) => {
    setSelectedContact(contact)
    setIsDeleteModalOpen(true)
  }

  const handleCall = (contact: Contact) => {
    window.open(`/dashboard/calls/initiate?contact_id=${contact.id}`, '_blank')
  }

  const handleFilterChange = (newFilters: Partial<ContactFilters>) => {
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
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'do_not_call': return 'bg-red-100 text-red-800'
      case 'invalid': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatPhone = (phone: string) => {
    if (!phone) return 'N/A'
    // Simple US phone formatting
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const columns = [
    {
      key: 'full_name',
      label: 'Contact',
      sortable: true,
      render: (value: string, row: Contact) => (
        <div>
          <div className="font-medium text-gray-900">{value || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{row.email || 'No email'}</div>
        </div>
      )
    },
    {
      key: 'phone_number',
      label: 'Phone',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <PhoneIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-900">{formatPhone(value)}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'tags',
      label: 'Tags',
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {value && value.length > 0 ? (
            value.slice(0, 3).map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {tag}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">No tags</span>
          )}
          {value && value.length > 3 && (
            <span className="text-sm text-gray-500">+{value.length - 3} more</span>
          )}
        </div>
      )
    },
    {
      key: 'last_contacted',
      label: 'Last Contact',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-gray-900">
          {value ? new Date(value).toLocaleDateString() : 'Never'}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Added',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ]

  const actions = [
    {
      label: 'Call Contact',
      onClick: handleCall,
      icon: PhoneIcon
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
  const totalContacts = contacts?.length || 0
  const activeContacts = contacts?.filter(c => c.status === 'active').length || 0
  const doNotCallContacts = contacts?.filter(c => c.status === 'do_not_call').length || 0
  const recentContacts = contacts?.filter(c => {
    const created = new Date(c.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return created > weekAgo
  }).length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your contact database and customer information
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            Import
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Contact
          </button>
        </div>
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
                <UserGroupIcon className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                  <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{activeContacts}</p>
                  <p className="text-xs text-gray-500">
                    {totalContacts > 0 ? Math.round((activeContacts / totalContacts) * 100) : 0}% of total
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold">📅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{recentContacts}</p>
                  <p className="text-xs text-gray-500">New contacts</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 font-bold">⛔</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Do Not Call</p>
                  <p className="text-2xl font-bold text-gray-900">{doNotCallContacts}</p>
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="do_not_call">Do Not Call</option>
                  <option value="invalid">Invalid</option>
                </select>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={filters.tags || ''}
                  onChange={(e) => handleFilterChange({ tags: e.target.value || undefined })}
                  placeholder="Filter by tags..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
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

          {/* Contacts Table */}
          <DataTable
            data={contacts || []}
            columns={columns}
            loading={isLoading}
            actions={actions}
            searchable
            emptyMessage="No contacts found for the selected project and filters."
            pagination={{
              page: pagination.page,
              limit: pagination.limit,
              total: contacts?.length || 0,
              onPageChange: (page) => setPagination(prev => ({ ...prev, page }))
            }}
          />
        </>
      )}

      {!filters.project_id && (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a project</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a project to view and manage contacts.
          </p>
        </div>
      )}

      {/* Create Contact Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Contact"
        size="lg"
      >
        <ContactForm
          projects={projects || []}
          selectedProjectId={filters.project_id}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={createMutation.isLoading}
        />
      </Modal>

      {/* Edit Contact Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedContact(null)
        }}
        title="Edit Contact"
        size="lg"
      >
        {selectedContact && (
          <ContactForm
            initialData={selectedContact}
            projects={projects || []}
            selectedProjectId={filters.project_id}
            onSubmit={(data) => updateMutation.mutate({ id: selectedContact.id, data })}
            onCancel={() => {
              setIsEditModalOpen(false)
              setSelectedContact(null)
            }}
            loading={updateMutation.isLoading}
          />
        )}
      </Modal>

      {/* Import Contacts Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Contacts"
        size="xl"
      >
        <ContactImport
          projects={projects || []}
          selectedProjectId={filters.project_id}
          onComplete={() => {
            setIsImportModalOpen(false)
            queryClient.invalidateQueries('contacts')
          }}
          onCancel={() => setIsImportModalOpen(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedContact(null)
        }}
        onConfirm={() => selectedContact && deleteMutation.mutate(selectedContact.id)}
        title="Delete Contact"
        message={`Are you sure you want to delete "${selectedContact?.full_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        loading={deleteMutation.isLoading}
      />
    </div>
  )
}