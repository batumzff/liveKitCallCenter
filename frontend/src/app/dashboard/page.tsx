'use client'

import { useQuery } from 'react-query'
import { projectsApi, analyticsApi } from '@/lib/api'
import {
  ChartBarIcon,
  PhoneIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href?: string
}

function StatsCard({ title, value, change, icon: Icon, href }: StatsCardProps) {
  const content = (
    <div className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6">
      <dt>
        <div className="absolute rounded-md bg-primary-500 p-3">
          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <p className="ml-16 truncate text-sm font-medium text-gray-500">{title}</p>
      </dt>
      <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {change && (
          <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
            {change}
          </p>
        )}
      </dd>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading } = useQuery(
    'projects',
    () => projectsApi.getAll()
  )

  const projectCount = projects?.data?.length || 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Welcome to your LiveKit Call Center dashboard. Monitor your call center performance and manage your projects.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Projects"
          value={projectsLoading ? '...' : projectCount}
          icon={UserGroupIcon}
          href="/dashboard/projects"
        />
        <StatsCard
          title="Active Calls"
          value="12"
          change="+2.5%"
          icon={PhoneIcon}
          href="/dashboard/calls"
        />
        <StatsCard
          title="Avg Call Duration"
          value="3m 24s"
          change="-0.8%"
          icon={ClockIcon}
        />
        <StatsCard
          title="Success Rate"
          value="87.3%"
          change="+1.2%"
          icon={ChartBarIcon}
          href="/dashboard/analytics"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/projects"
            className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="mt-2 block text-sm font-semibold text-gray-900">Create New Project</span>
          </Link>

          <Link
            href="/dashboard/agents"
            className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 16c0 2.5-2 4.5-4.5 4.5S12 18.5 12 16s2-4.5 4.5-4.5S21 13.5 21 16zM8 21l4-4 4 4M8 21h8"
              />
            </svg>
            <span className="mt-2 block text-sm font-semibold text-gray-900">Create AI Agent</span>
          </Link>

          <Link
            href="/dashboard/campaigns"
            className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l6-6m0 0l6 6m-6-6v18"
              />
            </svg>
            <span className="mt-2 block text-sm font-semibold text-gray-900">Start Campaign</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a project and making your first call.
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/projects"
                  className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}