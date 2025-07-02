'use client'

import { useState } from 'react'
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import { Menu } from '@headlessui/react'

interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchable?: boolean
  filterable?: boolean
  selectable?: boolean
  onSelectionChange?: (selected: T[]) => void
  actions?: {
    label: string
    onClick: (row: T) => void
    icon?: React.ComponentType<any>
  }[]
  emptyMessage?: string
  pagination?: {
    page: number
    limit: number
    total: number
    onPageChange: (page: number) => void
  }
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  searchable = true,
  filterable = false,
  selectable = false,
  onSelectionChange,
  actions,
  emptyMessage = 'No data available',
  pagination
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(data.map(row => row.id))
      setSelectedRows(allIds)
      onSelectionChange?.(data)
    } else {
      setSelectedRows(new Set())
      onSelectionChange?.([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRows(newSelected)
    
    const selectedData = data.filter(row => newSelected.has(row.id))
    onSelectionChange?.(selectedData)
  }

  // Filter and search data
  const filteredData = data.filter(row =>
    searchTerm === '' || 
    Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0
    
    const aValue = a[sortColumn as keyof T]
    const bValue = b[sortColumn as keyof T]
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const allSelected = selectedRows.size === data.length && data.length > 0
  const someSelected = selectedRows.size > 0 && selectedRows.size < data.length

  return (
    <div className="card overflow-hidden">
      {/* Header with search and filters */}
      {(searchable || filterable) && (
        <div className="px-6 py-4 border-b border-border-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {searchable && (
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10"
                  />
                </div>
              )}
              
              {filterable && (
                <button className="btn-outline btn-sm">
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filters
                </button>
              )}
            </div>
            
            {selectedRows.size > 0 && (
              <div className="text-sm text-text-secondary">
                {selectedRows.size} of {data.length} selected
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`table-header-cell ${
                    column.sortable ? 'cursor-pointer hover:bg-secondary-100' : ''
                  } ${column.width || ''}`}
                  onClick={column.sortable ? () => handleSort(String(column.key)) : undefined}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUpIcon 
                          className={`h-3 w-3 ${
                            sortColumn === column.key && sortDirection === 'asc' 
                              ? 'text-text-primary' 
                              : 'text-text-tertiary'
                          }`} 
                        />
                        <ChevronDownIcon 
                          className={`h-3 w-3 -mt-1 ${
                            sortColumn === column.key && sortDirection === 'desc' 
                              ? 'text-text-primary' 
                              : 'text-text-tertiary'
                          }`} 
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              
              {actions && actions.length > 0 && (
                <th className="table-header-cell">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="table-body">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="loading-spinner h-6 w-6"></div>
                    <span className="ml-2 text-sm text-text-tertiary">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-6 py-4 text-center text-text-tertiary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr key={row.id} className="table-row">
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td key={String(column.key)} className="table-cell">
                      {column.render 
                        ? column.render(row[column.key as keyof T], row)
                        : String(row[column.key as keyof T] || '')
                      }
                    </td>
                  ))}
                  
                  {actions && actions.length > 0 && (
                    <td className="table-cell font-medium">
                      {actions.length === 1 ? (
                        <button
                          onClick={() => actions[0].onClick(row)}
                          className="text-text-link hover:text-text-link-hover"
                        >
                          {actions[0].label}
                        </button>
                      ) : (
                        <Menu as="div" className="relative">
                          <Menu.Button className="text-text-tertiary hover:text-text-secondary">
                            <EllipsisHorizontalIcon className="h-5 w-5" />
                          </Menu.Button>
                          <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none rounded-md">
                            {actions.map((action, index) => (
                              <Menu.Item key={index}>
                                {({ active }) => (
                                  <button
                                    onClick={() => action.onClick(row)}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } group flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    {action.icon && <action.icon className="h-4 w-4 mr-3" />}
                                    {action.label}
                                  </button>
                                )}
                              </Menu.Item>
                            ))}
                          </Menu.Items>
                        </Menu>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}