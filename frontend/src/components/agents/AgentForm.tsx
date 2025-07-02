'use client'

import { useState, useEffect } from 'react'
import { Agent, AgentCreate, AgentUpdate, Project } from '@/types'

interface AgentFormProps {
  initialData?: Agent
  projects: Project[]
  onSubmit: (data: AgentCreate | AgentUpdate) => void
  onCancel: () => void
  loading?: boolean
}

const AI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended)' },
  { value: 'gpt-4o', label: 'GPT-4o (Advanced)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fast)' }
]

const VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'echo', label: 'Echo (Male)' },
  { value: 'fable', label: 'Fable (British Male)' },
  { value: 'onyx', label: 'Onyx (Deep Male)' },
  { value: 'nova', label: 'Nova (Female)' },
  { value: 'shimmer', label: 'Shimmer (Gentle Female)' }
]

const AGENT_TYPES = [
  { value: 'outbound_sales', label: 'Outbound Sales' },
  { value: 'inbound_support', label: 'Inbound Support' },
  { value: 'lead_qualification', label: 'Lead Qualification' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'appointment_booking', label: 'Appointment Booking' },
  { value: 'survey_collection', label: 'Survey Collection' }
]

const DEFAULT_SYSTEM_PROMPTS = {
  outbound_sales: `You are a professional outbound sales representative. Your goal is to:
- Introduce yourself and your company professionally
- Understand the prospect's needs and pain points
- Present relevant solutions that add value
- Handle objections with empathy and knowledge
- Guide the conversation toward a positive outcome
- Always be respectful and professional
- Listen actively and ask clarifying questions`,
  
  inbound_support: `You are a helpful customer support representative. Your responsibilities include:
- Greeting customers warmly and professionally
- Listening carefully to their concerns or questions
- Providing accurate and helpful information
- Escalating complex issues when necessary
- Following up to ensure customer satisfaction
- Maintaining a patient and empathetic tone throughout`,
  
  lead_qualification: `You are a lead qualification specialist. Your role is to:
- Engage prospects in friendly conversation
- Assess their level of interest and buying intent
- Qualify their budget, authority, need, and timeline (BANT)
- Gather relevant contact and company information
- Determine next steps based on qualification results
- Schedule follow-up calls or meetings when appropriate`,
  
  customer_service: `You are a customer service representative focused on:
- Providing exceptional customer experiences
- Resolving issues quickly and effectively
- Understanding customer needs and concerns
- Offering appropriate solutions and alternatives
- Maintaining detailed records of interactions
- Following company policies and procedures`,
  
  appointment_booking: `You are an appointment booking specialist whose job is to:
- Understand the customer's scheduling needs
- Check availability and propose suitable time slots
- Confirm appointment details clearly
- Send confirmation information
- Handle rescheduling requests professionally
- Maintain accurate calendar management`,
  
  survey_collection: `You are conducting surveys to gather valuable feedback. You should:
- Explain the purpose and importance of the survey
- Ask questions clearly and wait for complete responses
- Remain neutral and avoid leading questions
- Thank participants for their time and input
- Ensure data accuracy and completeness
- Maintain confidentiality and professionalism`
}

export function AgentForm({ initialData, projects, onSubmit, onCancel, loading = false }: AgentFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    project_id: '',
    agent_type: 'outbound_sales',
    model: 'gpt-4o-mini',
    voice: 'alloy',
    system_prompt: DEFAULT_SYSTEM_PROMPTS.outbound_sales,
    max_duration: 300,
    interruption_threshold: 100,
    temperature: 0.7,
    status: 'inactive' as const
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        project_id: initialData.project_id,
        agent_type: initialData.agent_type,
        model: initialData.model,
        voice: initialData.voice,
        system_prompt: initialData.system_prompt,
        max_duration: initialData.max_duration || 300,
        interruption_threshold: initialData.interruption_threshold || 100,
        temperature: initialData.temperature || 0.7,
        status: initialData.status
      })
    }
  }, [initialData])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Agent name must be at least 3 characters'
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Please select a project'
    }

    if (!formData.system_prompt.trim()) {
      newErrors.system_prompt = 'System prompt is required'
    } else if (formData.system_prompt.length < 50) {
      newErrors.system_prompt = 'System prompt should be at least 50 characters for better performance'
    }

    if (formData.max_duration < 60 || formData.max_duration > 1800) {
      newErrors.max_duration = 'Max duration must be between 60 and 1800 seconds'
    }

    if (formData.temperature < 0 || formData.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData: AgentCreate | AgentUpdate = {
      name: formData.name.trim(),
      project_id: formData.project_id,
      agent_type: formData.agent_type,
      model: formData.model,
      voice: formData.voice,
      system_prompt: formData.system_prompt.trim(),
      max_duration: formData.max_duration,
      interruption_threshold: formData.interruption_threshold,
      temperature: formData.temperature,
      ...(initialData ? { status: formData.status } : {})
    }

    onSubmit(submitData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Update system prompt when agent type changes
    if (field === 'agent_type' && !initialData) {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        system_prompt: DEFAULT_SYSTEM_PROMPTS[value as keyof typeof DEFAULT_SYSTEM_PROMPTS] || ''
      }))
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const activeProject = projects.find(p => p.id === formData.project_id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="Enter agent name"
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

        {/* Agent Type */}
        <div>
          <label htmlFor="agent_type" className="block text-sm font-medium text-gray-700 mb-2">
            Agent Type *
          </label>
          <select
            id="agent_type"
            value={formData.agent_type}
            onChange={(e) => handleChange('agent_type', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {AGENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* AI Model */}
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            AI Model *
          </label>
          <select
            id="model"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {AI_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* Voice */}
        <div>
          <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-2">
            Voice *
          </label>
          <select
            id="voice"
            value={formData.voice}
            onChange={(e) => handleChange('voice', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {VOICE_OPTIONS.map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status (only for edit) */}
        {initialData && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === 'active'}
                  onChange={() => handleChange('status', 'active')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === 'inactive'}
                  onChange={() => handleChange('status', 'inactive')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Inactive</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* System Prompt */}
      <div>
        <label htmlFor="system_prompt" className="block text-sm font-medium text-gray-700 mb-2">
          System Prompt *
        </label>
        <textarea
          id="system_prompt"
          rows={8}
          value={formData.system_prompt}
          onChange={(e) => handleChange('system_prompt', e.target.value)}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
            errors.system_prompt ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="Define how your AI agent should behave and respond during calls..."
        />
        <p className="mt-1 text-sm text-gray-500">
          {formData.system_prompt.length} characters (minimum 50 recommended)
        </p>
        {errors.system_prompt && (
          <p className="mt-1 text-sm text-red-600">{errors.system_prompt}</p>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="max_duration" className="block text-sm font-medium text-gray-700 mb-2">
            Max Call Duration (seconds)
          </label>
          <input
            type="number"
            id="max_duration"
            min="60"
            max="1800"
            value={formData.max_duration}
            onChange={(e) => handleChange('max_duration', parseInt(e.target.value))}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.max_duration ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
          />
          {errors.max_duration && (
            <p className="mt-1 text-sm text-red-600">{errors.max_duration}</p>
          )}
        </div>

        <div>
          <label htmlFor="interruption_threshold" className="block text-sm font-medium text-gray-700 mb-2">
            Interruption Threshold (ms)
          </label>
          <input
            type="number"
            id="interruption_threshold"
            min="50"
            max="500"
            value={formData.interruption_threshold}
            onChange={(e) => handleChange('interruption_threshold', parseInt(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="mt-1 text-sm text-gray-500">How quickly agent responds to interruptions</p>
        </div>

        <div>
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
            Temperature
          </label>
          <input
            type="number"
            id="temperature"
            step="0.1"
            min="0"
            max="2"
            value={formData.temperature}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
              errors.temperature ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
          />
          <p className="mt-1 text-sm text-gray-500">0 = focused, 2 = creative</p>
          {errors.temperature && (
            <p className="mt-1 text-sm text-red-600">{errors.temperature}</p>
          )}
        </div>
      </div>

      {/* Configuration Tips */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Write clear, specific system prompts for better agent performance</li>
          <li>• Lower temperature (0.3-0.7) for consistent responses, higher for creativity</li>
          <li>• Test your agent thoroughly before activating for campaigns</li>
          <li>• Monitor call outcomes and adjust prompts based on performance</li>
          <li>• Use appropriate voice that matches your brand and audience</li>
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
            initialData ? 'Update Agent' : 'Create Agent'
          )}
        </button>
      </div>
    </form>
  )
}