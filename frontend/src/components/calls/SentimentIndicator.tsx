'use client'

import { 
  FaceSmileIcon, 
  FaceFrownIcon, 
  MinusIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'
import { 
  FaceSmileIcon as FaceSmileIconSolid, 
  FaceFrownIcon as FaceFrownIconSolid 
} from '@heroicons/react/24/solid'

interface SentimentIndicatorProps {
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showConfidence?: boolean
}

const sentimentConfig = {
  positive: {
    icon: FaceSmileIcon,
    solidIcon: FaceSmileIconSolid,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    label: 'Positive',
    description: 'Customer seems satisfied'
  },
  negative: {
    icon: FaceFrownIcon,
    solidIcon: FaceFrownIconSolid,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    label: 'Negative',
    description: 'Customer seems dissatisfied'
  },
  neutral: {
    icon: MinusIcon,
    solidIcon: MinusIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    label: 'Neutral',
    description: 'Neutral sentiment'
  }
}

const sizeConfig = {
  sm: {
    icon: 'h-4 w-4',
    container: 'px-2 py-1',
    text: 'text-xs',
    badge: 'px-1.5 py-0.5'
  },
  md: {
    icon: 'h-5 w-5',
    container: 'px-3 py-2',
    text: 'text-sm',
    badge: 'px-2 py-1'
  },
  lg: {
    icon: 'h-6 w-6',
    container: 'px-4 py-3',
    text: 'text-base',
    badge: 'px-2.5 py-1.5'
  }
}

export function SentimentIndicator({
  sentiment,
  confidence = 0,
  size = 'md',
  showLabel = true,
  showConfidence = true
}: SentimentIndicatorProps) {
  const config = sentimentConfig[sentiment]
  const sizeStyles = sizeConfig[size]
  
  // Use solid icon for high confidence, outline for low confidence
  const IconComponent = confidence > 0.7 ? config.solidIcon : config.icon
  
  return (
    <div className="flex items-center space-x-2">
      {/* Sentiment Badge */}
      <div
        className={`
          inline-flex items-center space-x-1 rounded-full border
          ${config.bgColor} ${config.borderColor} ${sizeStyles.container}
        `}
      >
        <IconComponent className={`${config.color} ${sizeStyles.icon}`} />
        
        {showLabel && (
          <span className={`font-medium ${config.color} ${sizeStyles.text}`}>
            {config.label}
          </span>
        )}
      </div>
      
      {/* Confidence Badge */}
      {showConfidence && confidence > 0 && (
        <div className="flex items-center space-x-1">
          <span
            className={`
              inline-flex items-center rounded-full text-xs font-medium
              ${sizeStyles.badge}
              ${confidence > 0.8 
                ? 'bg-green-100 text-green-800' 
                : confidence > 0.6 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }
            `}
          >
            {Math.round(confidence * 100)}%
          </span>
          
          {confidence < 0.5 && (
            <ExclamationTriangleIcon 
              className="h-4 w-4 text-amber-500" 
              title="Low confidence"
            />
          )}
        </div>
      )}
    </div>
  )
}

// Extended version with emotion breakdown
interface EmotionBreakdownProps {
  emotions: Record<string, number>
  size?: 'sm' | 'md' | 'lg'
}

export function EmotionBreakdown({ emotions, size = 'md' }: EmotionBreakdownProps) {
  const sortedEmotions = Object.entries(emotions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) // Show top 5 emotions
  
  if (sortedEmotions.length === 0) {
    return null
  }
  
  const sizeStyles = sizeConfig[size]
  
  return (
    <div className="space-y-2">
      <h4 className={`font-medium text-gray-900 ${sizeStyles.text}`}>
        Emotion Breakdown
      </h4>
      <div className="space-y-1">
        {sortedEmotions.map(([emotion, score]) => (
          <div key={emotion} className="flex items-center justify-between">
            <span className={`text-gray-700 capitalize ${sizeStyles.text}`}>
              {emotion}
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    score > 0.7 ? 'bg-red-500' :
                    score > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${score * 100}%` }}
                />
              </div>
              <span className={`text-gray-600 font-mono ${sizeStyles.text}`}>
                {Math.round(score * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}