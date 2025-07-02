'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'react-query'
import { 
  ArrowLeftIcon,
  PlayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { callsApi, callAnalysisApi } from '@/lib/api'
import { TranscriptViewer } from '@/components/calls/TranscriptViewer'
import { CallAnalysisCard } from '@/components/calls/CallAnalysisCard'
import { SentimentIndicator } from '@/components/calls/SentimentIndicator'

interface CallAnalysisDetailPageProps {
  params: { id: string }
}

export default function CallAnalysisDetailPage({ params }: CallAnalysisDetailPageProps) {
  const router = useRouter()
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(true)
  
  const { data: call, isLoading: callLoading, error: callError } = useQuery(
    ['call', params.id],
    () => callsApi.getById(params.id).then(res => res.data),
    { staleTime: 5 * 60 * 1000 }
  )

  const { 
    data: analysis, 
    isLoading: analysisLoading, 
    error: analysisError,
    refetch: refetchAnalysis 
  } = useQuery(
    ['call-analysis', params.id],
    () => callAnalysisApi.getAnalysis(params.id).then(res => res.data),
    { 
      staleTime: 2 * 60 * 1000,
      retry: false // Don't retry if analysis doesn't exist yet
    }
  )

  const triggerAnalysisMutation = useMutation(
    () => callAnalysisApi.analyzeCall(params.id),
    {
      onSuccess: () => {
        // Refetch analysis after triggering
        setTimeout(() => refetchAnalysis(), 5000) // Wait 5 seconds for analysis to complete
      }
    }
  )

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'answered': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'no_answer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (callLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (callError || !call) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Call not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The call you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call Analysis</h1>
            <p className="mt-1 text-sm text-gray-600">
              Call to {call.phone_number} • {formatTimestamp(call.started_at)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {!analysis && call.transcript && (
            <button
              onClick={() => triggerAnalysisMutation.mutate()}
              disabled={triggerAnalysisMutation.isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {triggerAnalysisMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Analyze Call
                </>
              )}
            </button>
          )}
          
          {call.recording_url && (
            <button
              onClick={() => window.open(call.recording_url, '_blank')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Play Recording
            </button>
          )}
        </div>
      </div>

      {/* Call Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Call Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{call.phone_number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Call Type</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{call.call_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCallStatusColor(call.call_status)}`}>
                  {call.call_status.replace('_', ' ').toUpperCase()}
                </span>
              </dd>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Duration</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDuration(call.duration_seconds)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Started At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatTimestamp(call.started_at)}</dd>
            </div>
            {call.ended_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Ended At</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatTimestamp(call.ended_at)}</dd>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {call.sentiment && (
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-2">Sentiment</dt>
                <dd>
                  <SentimentIndicator 
                    sentiment={call.sentiment as 'positive' | 'negative' | 'neutral'}
                    confidence={call.sentiment_score ? Math.abs(call.sentiment_score) : 0}
                    size="sm"
                  />
                </dd>
              </div>
            )}
            {call.call_outcome && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Outcome</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{call.call_outcome.replace('_', ' ')}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Analysis Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  call.analysis_completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {call.analysis_completed ? 'Completed' : 'Pending'}
                </span>
              </dd>
            </div>
          </div>
        </div>

        {/* Call Summary */}
        {call.call_summary && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Call Summary</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 rounded-lg p-4">
              {call.call_summary}
            </dd>
          </div>
        )}

        {/* Key Points & Action Items */}
        {(call.key_points.length > 0 || call.action_items.length > 0) && (
          <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            {call.key_points.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-3">Key Points</dt>
                <dd>
                  <ul className="space-y-2">
                    {call.key_points.map((point, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                        </span>
                        <span className="text-sm text-gray-900">{point}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

            {call.action_items.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-3">Action Items</dt>
                <dd>
                  <ul className="space-y-2">
                    {call.action_items.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-xs font-medium text-green-600">✓</span>
                        </span>
                        <span className="text-sm text-gray-900">{item}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis Results */}
      {analysisLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
            <span className="text-sm text-gray-600">Loading AI analysis...</span>
          </div>
        </div>
      )}

      {analysis && (
        <CallAnalysisCard analysis={analysis} />
      )}

      {analysisError && !analysis && call.transcript && (
        <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Analysis not available</h3>
              <p className="text-sm text-gray-600 mt-1">
                This call hasn't been analyzed yet. Click "Analyze Call" to generate AI-powered insights.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transcript */}
      {call.transcript && (
        <TranscriptViewer
          transcript={call.transcript}
          analysis={analysis}
          isExpanded={isTranscriptExpanded}
          onToggle={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
        />
      )}

      {!call.transcript && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transcript available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Transcript will be generated automatically during the call.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}