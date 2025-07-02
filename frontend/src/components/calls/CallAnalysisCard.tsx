'use client'

import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { CallAnalysis } from '@/types'
import { SentimentIndicator, EmotionBreakdown } from './SentimentIndicator'

interface CallAnalysisCardProps {
  analysis: CallAnalysis
  compact?: boolean
}

export function CallAnalysisCard({ analysis, compact = false }: CallAnalysisCardProps) {
  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'successful':
        return 'text-green-600 bg-green-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'voicemail':
        return 'text-amber-600 bg-amber-100'
      case 'no_answer':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSuccessIcon = (probability: number) => {
    if (probability > 0.7) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    } else if (probability > 0.4) {
      return <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
    } else {
      return <XCircleIcon className="h-5 w-5 text-red-500" />
    }
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Call Analysis</h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOutcomeColor(
              analysis.call_outcome
            )}`}
          >
            {analysis.call_outcome.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <SentimentIndicator
              sentiment={analysis.sentiment}
              confidence={analysis.sentiment_confidence}
              size="sm"
            />
            <div className="flex items-center space-x-2">
              {getSuccessIcon(analysis.success_probability)}
              <span className="text-sm text-gray-600">
                {Math.round(analysis.success_probability * 100)}% Success
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-gray-600">Satisfaction: </span>
              <span className="font-medium">
                {Math.round(analysis.customer_satisfaction * 100)}%
              </span>
            </div>
            {analysis.voicemail_detected && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Voicemail
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Call Analysis</h3>
        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOutcomeColor(
              analysis.call_outcome
            )}`}
          >
            {analysis.call_outcome.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(analysis.analysis_timestamp).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Sentiment Analysis */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Sentiment</h4>
          <SentimentIndicator
            sentiment={analysis.sentiment}
            confidence={analysis.sentiment_confidence}
            showConfidence={true}
          />
          {Object.keys(analysis.emotions).length > 0 && (
            <EmotionBreakdown emotions={analysis.emotions} size="sm" />
          )}
        </div>

        {/* Success Analysis */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Success Analysis</h4>
          <div className="flex items-center space-x-2">
            {getSuccessIcon(analysis.success_probability)}
            <span className="text-2xl font-bold text-gray-900">
              {Math.round(analysis.success_probability * 100)}%
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Success Probability
          </div>
        </div>

        {/* Customer Satisfaction */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Satisfaction</h4>
          <div className="flex items-center space-x-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  analysis.customer_satisfaction > 0.7
                    ? 'bg-green-500'
                    : analysis.customer_satisfaction > 0.4
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${analysis.customer_satisfaction * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(analysis.customer_satisfaction * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Success & Failure Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Success Indicators */}
        {analysis.success_indicators.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Success Indicators</h4>
            <ul className="space-y-2">
              {analysis.success_indicators.map((indicator, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{indicator}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Failure Indicators */}
        {analysis.failure_indicators.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Areas for Improvement</h4>
            <ul className="space-y-2">
              {analysis.failure_indicators.map((indicator, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <XCircleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{indicator}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Customer Intent & Agent Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {analysis.customer_intent && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Intent</h4>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {analysis.customer_intent}
            </p>
          </div>
        )}

        {analysis.agent_performance && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Agent Performance</h4>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {analysis.agent_performance}
            </p>
          </div>
        )}
      </div>

      {/* Action Items */}
      {analysis.action_items.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Action Items</h4>
          <ul className="space-y-2">
            {analysis.action_items.map((item, index) => (
              <li
                key={index}
                className="flex items-start space-x-2 bg-blue-50 rounded-lg p-3"
              >
                <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                </div>
                <span className="text-sm text-blue-900">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}