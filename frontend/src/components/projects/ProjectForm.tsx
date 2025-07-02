'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectCreate, ProjectUpdate } from '@/types'

interface ProjectFormProps {
  initialData?: Project
  onSubmit: (data: ProjectCreate | ProjectUpdate) => void
  onCancel: () => void
  loading?: boolean
}

export function ProjectForm({ initialData, onSubmit, onCancel, loading = false }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
        is_active: initialData.is_active
      })
    }
  }, [initialData])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters'
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData: ProjectCreate | ProjectUpdate = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      ...(initialData ? { is_active: formData.is_active } : {})
    }

    onSubmit(submitData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Name */}
      <div>
        <label htmlFor="name" className="form-label required">
          Project Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`form-input ${errors.name ? 'error' : ''}`}
          placeholder="Enter project name"
        />
        {errors.name && (
          <p className="form-error">{errors.name}</p>
        )}
      </div>

      {/* Project Description */}
      <div>
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className={`form-textarea ${errors.description ? 'error' : ''}`}
          placeholder="Describe your project (optional)"
        />
        <p className="form-helper">
          {formData.description.length}/500 characters
        </p>
        {errors.description && (
          <p className="form-error">{errors.description}</p>
        )}
      </div>

      {/* Status (only for edit) */}
      {initialData && (
        <div>
          <label className="form-label">
            Status
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                checked={formData.is_active}
                onChange={() => handleChange('is_active', true)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-border-medium"
              />
              <span className="ml-2 text-sm text-text-primary">Active</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                checked={!formData.is_active}
                onChange={() => handleChange('is_active', false)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-border-medium"
              />
              <span className="ml-2 text-sm text-text-primary">Inactive</span>
            </label>
          </div>
          <p className="form-helper">
            Inactive projects cannot be used for new campaigns or calls
          </p>
        </div>
      )}

      {/* Project Guidelines */}
      <div className="bg-secondary-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-text-primary mb-2">Project Guidelines</h4>
        <ul className="text-sm text-text-secondary space-y-1">
          <li>• Choose a descriptive name that clearly identifies your project</li>
          <li>• Use the description to explain the project's purpose and goals</li>
          <li>• You can organize campaigns, agents, and contacts under this project</li>
          <li>• Active projects can be used for new campaigns and calls</li>
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-border-light">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-outline"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <div className="loading-spinner h-4 w-4 border-white mr-2 inline-block"></div>
              {initialData ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            initialData ? 'Update Project' : 'Create Project'
          )}
        </button>
      </div>
    </form>
  )
}