'use client'

import { useState, useEffect } from 'react'
import { Contact, ContactCreate, ContactUpdate, Project } from '@/types'

interface ContactFormProps {
  initialData?: Contact
  projects: Project[]
  selectedProjectId?: string
  onSubmit: (data: ContactCreate | ContactUpdate) => void
  onCancel: () => void
  loading?: boolean
}

const CONTACT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'do_not_call', label: 'Do Not Call' },
  { value: 'invalid', label: 'Invalid' }
]

export function ContactForm({ 
  initialData, 
  projects, 
  selectedProjectId,
  onSubmit, 
  onCancel, 
  loading = false 
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    project_id: selectedProjectId || '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    company: '',
    job_title: '',
    status: 'active' as const,
    tags: [] as string[],
    notes: '',
    custom_fields: {} as Record<string, any>
  })
  
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        project_id: initialData.project_id,
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        email: initialData.email || '',
        phone_number: initialData.phone_number,
        company: initialData.company || '',
        job_title: initialData.job_title || '',
        status: initialData.status,
        tags: initialData.tags || [],
        notes: initialData.notes || '',
        custom_fields: initialData.custom_fields || {}
      })
    } else if (selectedProjectId) {
      setFormData(prev => ({ ...prev, project_id: selectedProjectId }))
    }
  }, [initialData, selectedProjectId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.project_id) {
      newErrors.project_id = 'Please select a project'
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required'
    } else {
      // Basic phone validation
      const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/
      if (!phoneRegex.test(formData.phone_number)) {
        newErrors.phone_number = 'Please enter a valid phone number'
      }
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData: ContactCreate | ContactUpdate = {
      project_id: formData.project_id,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim() || undefined,
      email: formData.email.trim() || undefined,
      phone_number: formData.phone_number.trim(),
      company: formData.company.trim() || undefined,
      job_title: formData.job_title.trim() || undefined,
      status: formData.status,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      notes: formData.notes.trim() || undefined,
      custom_fields: Object.keys(formData.custom_fields).length > 0 ? formData.custom_fields : undefined
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

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const activeProject = projects.find(p => p.id === formData.project_id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Selection */}
      <div>
        <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
          Project *
        </label>
        <select
          id="project_id"
          value={formData.project_id}
          onChange={(e) => handleChange('project_id', e.target.value)}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
            errors.project_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
          }`}
        >
          <option value="">Select a project...</option>
          {projects
            .filter(p => p.is_active)
            .map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
        </select>
        {errors.project_id && (
          <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>
        )}
        {activeProject && (
          <p className="mt-1 text-sm text-gray-500">
            Selected: {activeProject.name}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.first_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="Enter first name"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
            Last Name
          </label>
          <input
            type="text"
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter last name"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone_number"
            value={formData.phone_number}
            onChange={(e) => handleChange('phone_number', e.target.value)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.phone_number ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone_number && (
            <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="contact@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Company */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
            Company
          </label>
          <input
            type="text"
            id="company"
            value={formData.company}
            onChange={(e) => handleChange('company', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Company name"
          />
        </div>

        {/* Job Title */}
        <div>
          <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-2">
            Job Title
          </label>
          <input
            type="text"
            id="job_title"
            value={formData.job_title}
            onChange={(e) => handleChange('job_title', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Job title"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CONTACT_STATUSES.map((status) => (
            <label key={status.value} className="flex items-center">
              <input
                type="radio"
                name="status"
                value={status.value}
                checked={formData.status === status.value}
                onChange={() => handleChange('status', status.value)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{status.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleTagInputKeyPress}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Add a tag..."
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Add
          </button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-blue-600 hover:text-blue-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Add any additional notes about this contact..."
        />
        <p className="mt-1 text-sm text-gray-500">
          {formData.notes.length}/1000 characters
        </p>
      </div>

      {/* Contact Guidelines */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Contact Guidelines</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Always verify phone numbers before adding to ensure deliverability</li>
          <li>• Use tags to organize contacts by source, interest, or campaign type</li>
          <li>• Mark contacts as "Do Not Call" if they've requested to be removed</li>
          <li>• Keep notes updated with relevant conversation history</li>
          <li>• Respect privacy laws and regulations in your jurisdiction</li>
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
              {initialData ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            initialData ? 'Update Contact' : 'Add Contact'
          )}
        </button>
      </div>
    </form>
  )
}