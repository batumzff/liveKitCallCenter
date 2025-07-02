'use client'

import { Fragment } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { CallAnalysis } from '@/types'
import { SentimentIndicator } from './SentimentIndicator'

interface TranscriptViewerProps {
  transcript: string
  analysis?: CallAnalysis
  isExpanded?: boolean
  onToggle?: () => void
}

interface TranscriptLine {
  timestamp: string
  speaker: string
  text: string
}

function parseTranscript(transcript: string): TranscriptLine[] {
  const lines = transcript.split('\n').filter(line => line.trim())
  
  return lines.map(line => {
    // Parse format: [HH:MM:SS] Speaker: Text
    const match = line.match(/\[(\d{2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.+)/)
    
    if (match) {
      return {
        timestamp: match[1],
        speaker: match[2].trim(),
        text: match[3].trim()
      }
    }
    
    // Fallback for non-formatted lines
    return {
      timestamp: '',
      speaker: 'Unknown',
      text: line
    }
  })
}

function getSpeakerColor(speaker: string): string {
  if (speaker.toLowerCase().includes('agent')) {
    return 'text-blue-600 bg-blue-50'
  } else if (speaker.toLowerCase().includes('customer')) {
    return 'text-green-600 bg-green-50'
  }
  return 'text-gray-600 bg-gray-50'
}

export function TranscriptViewer({ 
  transcript, 
  analysis, 
  isExpanded = true, 
  onToggle 
}: TranscriptViewerProps) {
  const transcriptLines = parseTranscript(transcript)
  
  if (!transcript) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <p>No transcript available</p>
          <p className="text-sm mt-1">Transcript will appear here after the call is analyzed</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900">Call Transcript</h3>
            {analysis && (
              <SentimentIndicator 
                sentiment={analysis.sentiment}
                confidence={analysis.sentiment_confidence}
                size="sm"
              />
            )}
          </div>
          
          {onToggle && (
            <button
              onClick={onToggle}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? (
                <>
                  <ChevronDownIcon className="h-4 w-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronRightIcon className="h-4 w-4 mr-1" />
                  Expand
                </>
              )}
            </button>
          )}
        </div>
        
        {analysis && (
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
            <span>Duration: {transcriptLines.length} entries</span>
            <span>•</span>
            <span>Success Rate: {Math.round(analysis.success_probability * 100)}%</span>
            {analysis.voicemail_detected && (
              <>
                <span>•</span>
                <span className="text-amber-600">Voicemail Detected</span>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Transcript Content */}
      {isExpanded && (
        <div className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {transcriptLines.map((line, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg ${getSpeakerColor(line.speaker)}`}
              >
                {/* Timestamp */}
                {line.timestamp && (
                  <span className="text-xs text-gray-500 font-mono mt-1 min-w-[60px]">
                    {line.timestamp}
                  </span>
                )}
                
                {/* Speaker */}
                <span className="font-medium min-w-[80px] text-sm">
                  {line.speaker}:
                </span>
                
                {/* Text */}
                <p className="text-sm text-gray-900 flex-1 leading-relaxed">
                  {line.text}
                </p>
              </div>
            ))}
          </div>
          
          {/* Key Topics & Insights */}
          {analysis && (analysis.key_topics.length > 0 || analysis.customer_intent) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Key Insights</h4>
              <div className="space-y-3">
                {analysis.customer_intent && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Customer Intent: </span>
                    <span className="text-sm text-gray-600">{analysis.customer_intent}</span>
                  </div>
                )}
                
                {analysis.key_topics.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Topics: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysis.key_topics.map((topic, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}