export interface Project {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface AIAgent {
  id: string
  project_id: string
  name: string
  prompt: string
  voice_settings: Record<string, any>
  behavior_settings: Record<string, any>
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface Contact {
  id: string
  project_id: string
  name: string
  phone_number: string
  email?: string
  notes?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  project_id: string
  ai_agent_id?: string
  name: string
  description?: string
  campaign_type: 'individual' | 'group' | 'batch'
  status: 'pending' | 'active' | 'paused' | 'completed'
  scheduled_at?: string
  created_at: string
}

export interface Call {
  id: string
  project_id: string
  campaign_id?: string
  contact_id?: string
  ai_agent_id?: string
  room_name?: string
  participant_id?: string
  sip_call_id?: string
  call_type: 'inbound' | 'outbound'
  phone_number: string
  call_status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'no_answer'
  started_at: string
  answered_at?: string
  ended_at?: string
  duration_seconds?: number
  recording_url?: string
  transcript?: string
  sentiment_score?: number
  call_summary?: string
  key_points: string[]
  action_items: string[]
  call_outcome?: string
  created_at: string
}

export interface CallAnalytics {
  id: string
  call_id: string
  project_id: string
  total_words?: number
  agent_talk_time_seconds?: number
  caller_talk_time_seconds?: number
  silence_duration_seconds?: number
  interruptions_count?: number
  emotions: Record<string, number>
  confidence_scores: Record<string, number>
  response_time_avg_ms?: number
  task_completion_rate?: number
  customer_satisfaction_score?: number
  created_at: string
}

export interface ProjectAnalyticsSummary {
  project_id: string
  period_days: number
  date_range: {
    start: string
    end: string
  }
  call_metrics: {
    total_calls: number
    completed_calls: number
    failed_calls: number
    answered_calls: number
    answer_rate: number
    completion_rate: number
  }
  duration_metrics: {
    total_duration_seconds: number
    average_duration_seconds: number
    total_duration_hours: number
  }
  quality_metrics: {
    average_sentiment_score: number
    average_satisfaction_score: number
    total_interruptions: number
    avg_interruptions_per_call: number
  }
}

export interface AgentPerformance {
  agent_id: string
  agent_name: string
  metrics: {
    total_calls: number
    completed_calls: number
    completion_rate: number
    average_duration: number
    average_sentiment: number
    average_satisfaction: number
  }
}

export interface ProjectTrend {
  date: string
  total_calls: number
  completed_calls: number
  failed_calls: number
  total_duration: number
}

export interface CallOutcome {
  outcome: string
  count: number
  percentage: number
}

// API Request/Response types
export interface ProjectCreate {
  name: string
  description?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
  is_active?: boolean
}

export interface AIAgentCreate {
  project_id: string
  name: string
  prompt: string
  voice_settings?: Record<string, any>
  behavior_settings?: Record<string, any>
}

export interface AIAgentUpdate {
  name?: string
  prompt?: string
  voice_settings?: Record<string, any>
  behavior_settings?: Record<string, any>
  is_active?: boolean
}

export interface ContactCreate {
  project_id: string
  name: string
  phone_number: string
  email?: string
  notes?: string
  tags?: string[]
}

export interface ContactUpdate {
  name?: string
  phone_number?: string
  email?: string
  notes?: string
  tags?: string[]
}

export interface CampaignCreate {
  project_id: string
  ai_agent_id?: string
  name: string
  description?: string
  campaign_type: 'individual' | 'group' | 'batch'
  scheduled_at?: string
}

export interface CampaignUpdate {
  name?: string
  description?: string
  ai_agent_id?: string
  status?: 'pending' | 'active' | 'paused' | 'completed'
  scheduled_at?: string
}

export interface CallCreate {
  project_id: string
  campaign_id?: string
  contact_id?: string
  ai_agent_id?: string
  call_type: 'inbound' | 'outbound'
  phone_number: string
}

export interface CallUpdate {
  call_status?: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'no_answer'
  answered_at?: string
  ended_at?: string
  duration_seconds?: number
  recording_url?: string
  transcript?: string
  sentiment_score?: number
  call_summary?: string
  key_points?: string[]
  action_items?: string[]
  call_outcome?: string
}