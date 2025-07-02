'use client'

import { useState, useEffect } from 'react'
import { Campaign, CampaignCreate, CampaignUpdate, Project, Agent } from '@/types'

interface CampaignFormProps {
  initialData?: Campaign
  projects: Project[]
  agents: Agent[]
  selectedProjectId?: string
  onSubmit: (data: CampaignCreate | CampaignUpdate) => void
  onCancel: () => void
  loading?: boolean
}

const CAMPAIGN_TYPES = [
  { value: 'outbound_sales', label: 'Outbound Sales' },
  { value: 'lead_qualification', label: 'Lead Qualification' },
  { value: 'customer_survey', label: 'Customer Survey' },
  { value: 'appointment_booking', label: 'Appointment Booking' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'customer_service', label: 'Customer Service' }
]

const CALL_SCHEDULES = [
  { value: 'immediate', label: 'Start Immediately' },
  { value: 'scheduled', label: 'Schedule for Later' },
  { value: 'recurring', label: 'Recurring Campaign' }
]

const TIME_ZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' }
]

export function CampaignForm({ 
  initialData, 
  projects, 
  agents, 
  selectedProjectId,
  onSubmit, 
  onCancel, 
  loading = false 
}: CampaignFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    project_id: selectedProjectId || '',
    campaign_type: 'outbound_sales',
    agent_id: '',
    description: '',
    call_schedule: 'immediate',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '17:00',
    time_zone: 'America/New_York',
    max_attempts: 3,
    retry_delay_hours: 24,
    concurrent_calls: 5,
    contact_list_filters: {
      tags: [],
      status: 'active'
    }
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        project_id: initialData.project_id,
        campaign_type: initialData.campaign_type,
        agent_id: initialData.agent_id || '',
        description: initialData.description || '',
        call_schedule: initialData.start_date ? 'scheduled' : 'immediate',
        start_date: initialData.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : '',
        end_date: initialData.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : '',
        start_time: initialData.start_time || '09:00',
        end_time: initialData.end_time || '17:00',
        time_zone: initialData.time_zone || 'America/New_York',
        max_attempts: initialData.max_attempts || 3,
        retry_delay_hours: initialData.retry_delay_hours || 24,
        concurrent_calls: initialData.concurrent_calls || 5,
        contact_list_filters: initialData.contact_list_filters || {
          tags: [],
          status: 'active'
        }
      })
    } else if (selectedProjectId) {
      setFormData(prev => ({ ...prev, project_id: selectedProjectId }))
    }
  }, [initialData, selectedProjectId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Campaign name must be at least 3 characters'
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Please select a project'
    }

    if (!formData.agent_id) {
      newErrors.agent_id = 'Please select an AI agent'
    }

    if (formData.call_schedule === 'scheduled') {
      if (!formData.start_date) {
        newErrors.start_date = 'Start date is required for scheduled campaigns'
      } else {
        const startDate = new Date(formData.start_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (startDate < today) {
          newErrors.start_date = 'Start date cannot be in the past'
        }
      }

      if (formData.end_date && formData.start_date) {
        const startDate = new Date(formData.start_date)
        const endDate = new Date(formData.end_date)
        if (endDate <= startDate) {
          newErrors.end_date = 'End date must be after start date'
        }
      }
    }

    if (formData.max_attempts < 1 || formData.max_attempts > 10) {
      newErrors.max_attempts = 'Max attempts must be between 1 and 10'
    }

    if (formData.concurrent_calls < 1 || formData.concurrent_calls > 50) {
      newErrors.concurrent_calls = 'Concurrent calls must be between 1 and 50'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData: CampaignCreate | CampaignUpdate = {
      name: formData.name.trim(),
      project_id: formData.project_id,
      campaign_type: formData.campaign_type,
      agent_id: formData.agent_id,
      description: formData.description.trim() || undefined,
      start_date: formData.call_schedule === 'scheduled' ? formData.start_date : undefined,
      end_date: formData.call_schedule === 'scheduled' ? formData.end_date || undefined : undefined,
      start_time: formData.start_time,
      end_time: formData.end_time,
      time_zone: formData.time_zone,
      max_attempts: formData.max_attempts,
      retry_delay_hours: formData.retry_delay_hours,
      concurrent_calls: formData.concurrent_calls,
      contact_list_filters: formData.contact_list_filters
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

  const activeProject = projects.find(p => p.id === formData.project_id)
  const projectAgents = agents.filter(a => a.project_id === formData.project_id && a.status === 'active')
  const selectedAgent = agents.find(a => a.id === formData.agent_id)

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campaign Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="Enter campaign name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Project Selection */}
        <div>
          <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
            Project *
          </label>
          <select
            id="project_id"
            value={formData.project_id}
            onChange={(e) => {
              handleChange('project_id', e.target.value)
              handleChange('agent_id', '') // Reset agent when project changes
            }}
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
        </div>

        {/* Campaign Type */}
        <div>
          <label htmlFor="campaign_type" className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Type *
          </label>
          <select
            id="campaign_type"
            value={formData.campaign_type}
            onChange={(e) => handleChange('campaign_type', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {CAMPAIGN_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* AI Agent Selection */}
        <div>
          <label htmlFor="agent_id" className="block text-sm font-medium text-gray-700 mb-2">
            AI Agent *
          </label>
          <select
            id="agent_id"
            value={formData.agent_id}
            onChange={(e) => handleChange('agent_id', e.target.value)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.agent_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            disabled={!formData.project_id}
          >
            <option value="">Select an agent...</option>
            {projectAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.agent_type.replace('_', ' ')})
              </option>
            ))}
          </select>
          {errors.agent_id && (
            <p className="mt-1 text-sm text-red-600">{errors.agent_id}</p>
          )}
          {formData.project_id && projectAgents.length === 0 && (
            <p className="mt-1 text-sm text-yellow-600">
              No active agents found for this project. Create an agent first.
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Describe the purpose and goals of this campaign..."
        />
        <p className="mt-1 text-sm text-gray-500">
          {formData.description.length}/500 characters
        </p>
      </div>

      {/* Scheduling */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Campaign Schedule
        </label>
        <div className="space-y-4">
          {CALL_SCHEDULES.map((schedule) => (
            <label key={schedule.value} className="flex items-center">
              <input
                type="radio"
                name="call_schedule"
                value={schedule.value}
                checked={formData.call_schedule === schedule.value}
                onChange={() => handleChange('call_schedule', schedule.value)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{schedule.label}</span>
            </label>
          ))}
        </div>

        {formData.call_schedule === 'scheduled' && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                min={getTodayDate()}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.start_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                }`}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
              )}
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                min={formData.start_date || getTodayDate()}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.end_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                }`}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Calling Hours & Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
            Start Time
          </label>
          <input
            type="time"
            id="start_time"
            value={formData.start_time}
            onChange={(e) => handleChange('start_time', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
            End Time
          </label>
          <input
            type="time"
            id="end_time"
            value={formData.end_time}
            onChange={(e) => handleChange('end_time', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="time_zone" className="block text-sm font-medium text-gray-700 mb-2">
            Time Zone
          </label>
          <select
            id="time_zone"
            value={formData.time_zone}
            onChange={(e) => handleChange('time_zone', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {TIME_ZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Call Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="max_attempts" className="block text-sm font-medium text-gray-700 mb-2">
            Max Attempts per Contact
          </label>
          <input
            type="number"
            id="max_attempts"
            min="1"
            max="10"
            value={formData.max_attempts}
            onChange={(e) => handleChange('max_attempts', parseInt(e.target.value))}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.max_attempts ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
          />
          {errors.max_attempts && (
            <p className="mt-1 text-sm text-red-600">{errors.max_attempts}</p>
          )}
        </div>

        <div>
          <label htmlFor="retry_delay_hours" className="block text-sm font-medium text-gray-700 mb-2">
            Retry Delay (hours)
          </label>
          <input
            type="number"
            id="retry_delay_hours"
            min="1"
            max="168"
            value={formData.retry_delay_hours}
            onChange={(e) => handleChange('retry_delay_hours', parseInt(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="concurrent_calls" className="block text-sm font-medium text-gray-700 mb-2">
            Concurrent Calls
          </label>
          <input
            type="number"
            id="concurrent_calls"
            min="1"
            max="50"
            value={formData.concurrent_calls}
            onChange={(e) => handleChange('concurrent_calls', parseInt(e.target.value))}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.concurrent_calls ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
          />
          {errors.concurrent_calls && (
            <p className="mt-1 text-sm text-red-600">{errors.concurrent_calls}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">Number of simultaneous calls</p>
        </div>
      </div>

      {/* Campaign Guidelines */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Campaign Best Practices</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Choose descriptive names that clearly identify the campaign purpose</li>
          <li>• Select appropriate calling hours for your target audience's time zone</li>
          <li>• Start with lower concurrent calls and scale up based on performance</li>
          <li>• Test your AI agent thoroughly before launching the campaign</li>
          <li>• Monitor campaign performance and adjust settings as needed</li>
          <li>• Respect do-not-call lists and privacy regulations</li>
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
            initialData ? 'Update Campaign' : 'Create Campaign'
          )}
        </button>
      </div>
    </form>
  )
}