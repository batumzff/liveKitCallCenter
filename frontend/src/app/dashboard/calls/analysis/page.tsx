'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { callAnalysisApi, projectsApi } from '@/lib/api'
import { CallAnalysis, CallAnalysisSummary } from '@/types'
import { SentimentIndicator } from '@/components/calls/SentimentIndicator'

interface AnalysisFilters {
  project_id?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
  call_outcome?: 'successful' | 'failed' | 'voicemail' | 'no_answer'
  min_success_probability?: number
  voicemail_detected?: boolean
}

export default function CallAnalysisPage() {
  const [filters, setFilters] = useState<AnalysisFilters>({})
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch projects for filter dropdown
  const { data: projects } = useQuery(
    'projects',
    () => projectsApi.getAll().then(res => res.data),
    { staleTime: 5 * 60 * 1000 }
  )

  // Fetch analysis summary for selected project
  const { data: summary, isLoading: summaryLoading } = useQuery(
    ['analysis-summary', selectedProjectId],
    () => selectedProjectId ? callAnalysisApi.getProjectAnalysisSummary(selectedProjectId).then(res => res.data) : null,
    { enabled: !!selectedProjectId, staleTime: 2 * 60 * 1000 }
  )

  // Fetch analyzed calls
  const { data: analyzedCalls, isLoading: callsLoading, refetch } = useQuery(
    ['analyzed-calls', selectedProjectId, filters],
    () => selectedProjectId ? callAnalysisApi.getAnalyzedCalls(selectedProjectId, filters).then(res => res.data) : [],
    { enabled: !!selectedProjectId, staleTime: 1 * 60 * 1000 }
  )

  const handleFilterChange = (newFilters: Partial<AnalysisFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
  }

  const getCallOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'successful': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'voicemail': return 'bg-amber-100 text-amber-800'
      case 'no_answer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Analysis</h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered analysis of call transcripts, sentiment, and success metrics
          </p>
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
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
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

      {selectedProjectId && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.total_calls}</p>
                    <p className="text-xs text-gray-500">
                      {summary.analyzed_calls} analyzed ({Math.round((summary.analyzed_calls / summary.total_calls) * 100)}%)
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(summary.average_success_rate * 100)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <span className="text-indigo-600 font-bold">😊</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(summary.average_satisfaction * 100)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <span className="text-amber-600 font-bold">📞</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Voicemail Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(summary.voicemail_rate * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Sentiment Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sentiment
                </label>
                <select
                  value={filters.sentiment || ''}
                  onChange={(e) => handleFilterChange({ 
                    sentiment: e.target.value as 'positive' | 'negative' | 'neutral' || undefined 
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              {/* Call Outcome Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Outcome
                </label>
                <select
                  value={filters.call_outcome || ''}
                  onChange={(e) => handleFilterChange({ 
                    call_outcome: e.target.value as 'successful' | 'failed' | 'voicemail' | 'no_answer' || undefined 
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All outcomes</option>
                  <option value="successful">Successful</option>
                  <option value="failed">Failed</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="no_answer">No Answer</option>
                </select>
              </div>

              {/* Success Probability Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Success Rate
                </label>
                <select
                  value={filters.min_success_probability || ''}
                  onChange={(e) => handleFilterChange({ 
                    min_success_probability: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Any success rate</option>
                  <option value="0.8">80%+</option>
                  <option value="0.6">60%+</option>
                  <option value="0.4">40%+</option>
                  <option value="0.2">20%+</option>
                </select>
              </div>

              {/* Voicemail Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voicemail Detection
                </label>
                <select
                  value={filters.voicemail_detected !== undefined ? filters.voicemail_detected.toString() : ''}
                  onChange={(e) => handleFilterChange({ 
                    voicemail_detected: e.target.value ? e.target.value === 'true' : undefined 
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All calls</option>
                  <option value="true">Voicemail detected</option>
                  <option value="false">No voicemail</option>
                </select>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Analysis Results</h3>
              <p className="text-sm text-gray-600 mt-1">
                {analyzedCalls?.length || 0} calls found
              </p>
            </div>

            <div className="overflow-hidden">
              {callsLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading analysis results...</p>
                </div>
              ) : analyzedCalls && analyzedCalls.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Call ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sentiment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Success Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Outcome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Satisfaction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Analyzed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analyzedCalls.map((analysis) => (
                        <tr key={analysis.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {analysis.call_id.slice(-8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <SentimentIndicator
                              sentiment={analysis.sentiment}
                              confidence={analysis.sentiment_confidence}
                              size="sm"
                              showConfidence={false}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    analysis.success_probability > 0.7 ? 'bg-green-500' :
                                    analysis.success_probability > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${analysis.success_probability * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">
                                {Math.round(analysis.success_probability * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCallOutcomeColor(analysis.call_outcome)}`}>
                              {analysis.call_outcome.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Math.round(analysis.customer_satisfaction * 100)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTimestamp(analysis.analysis_timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => window.open(`/dashboard/calls/${analysis.call_id}/analysis`, '_blank')}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No analysis results found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your filters or ensure calls have been analyzed
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!selectedProjectId && (
        <div className="text-center py-12">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a project</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a project to view call analysis data and insights.
          </p>
        </div>
      )}
    </div>
  )
}