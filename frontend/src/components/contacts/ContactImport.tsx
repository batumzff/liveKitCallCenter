'use client'

import { useState } from 'react'
import { Project } from '@/types'
import { DocumentArrowUpIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface ContactImportProps {
  projects: Project[]
  selectedProjectId?: string
  onComplete: () => void
  onCancel: () => void
}

interface ImportPreview {
  total: number
  valid: number
  invalid: number
  duplicates: number
  sample: any[]
}

export function ContactImport({ projects, selectedProjectId, onComplete, onCancel }: ContactImportProps) {
  const [projectId, setProjectId] = useState(selectedProjectId || '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
      // In a real implementation, you'd parse the CSV here
      processFile(selectedFile)
    }
  }

  const processFile = async (file: File) => {
    try {
      // Mock CSV processing - in reality, you'd use a CSV parser
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0]?.split(',') || []
      
      // Mock preview data
      setPreview({
        total: lines.length - 1,
        valid: Math.floor((lines.length - 1) * 0.85),
        invalid: Math.floor((lines.length - 1) * 0.10),
        duplicates: Math.floor((lines.length - 1) * 0.05),
        sample: [
          { first_name: 'John', last_name: 'Doe', phone_number: '+1234567890', email: 'john@example.com' },
          { first_name: 'Jane', last_name: 'Smith', phone_number: '+1987654321', email: 'jane@example.com' },
          { first_name: 'Bob', last_name: 'Johnson', phone_number: '+1122334455', email: 'bob@example.com' }
        ]
      })
    } catch (error) {
      setError('Failed to process file. Please ensure it\'s a valid CSV.')
    }
  }

  const handleImport = async () => {
    if (!projectId || !file || !preview) return

    setImporting(true)
    try {
      // Mock import process - in reality, you'd make API calls
      await new Promise(resolve => setTimeout(resolve, 2000))
      setCompleted(true)
    } catch (error) {
      setError('Failed to import contacts. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const handleComplete = () => {
    onComplete()
  }

  if (completed) {
    return (
      <div className="text-center py-8">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Import Completed!</h3>
        <p className="mt-2 text-sm text-gray-600">
          Successfully imported {preview?.valid || 0} contacts.
        </p>
        <div className="mt-6">
          <button
            onClick={handleComplete}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <div>
        <label htmlFor="import_project" className="block text-sm font-medium text-gray-700 mb-2">
          Select Project *
        </label>
        <select
          id="import_project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">Choose a project...</option>
          {projects
            .filter(p => p.is_active)
            .map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
        </select>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload CSV File *
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">CSV files only</p>
          </div>
        </div>
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {file.name} ({Math.round(file.size / 1024)} KB)
          </p>
        )}
      </div>

      {/* CSV Format Requirements */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements</h4>
        <div className="text-sm text-blue-700">
          <p className="mb-2">Your CSV file should include the following columns:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>first_name</strong> (required)</li>
            <li><strong>phone_number</strong> (required)</li>
            <li><strong>last_name</strong> (optional)</li>
            <li><strong>email</strong> (optional)</li>
            <li><strong>company</strong> (optional)</li>
            <li><strong>job_title</strong> (optional)</li>
            <li><strong>tags</strong> (optional, comma-separated)</li>
          </ul>
          <p className="mt-2 text-xs">
            Additional columns will be imported as custom fields.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Import Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Import Preview</h3>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{preview.total}</div>
              <div className="text-sm text-gray-600">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{preview.valid}</div>
              <div className="text-sm text-gray-600">Valid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{preview.invalid}</div>
              <div className="text-sm text-gray-600">Invalid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{preview.duplicates}</div>
              <div className="text-sm text-gray-600">Duplicates</div>
            </div>
          </div>

          {/* Sample Data */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Sample Data (First 3 rows)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.sample.map((contact, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{contact.phone_number}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{contact.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {preview.invalid > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Validation Issues</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    {preview.invalid} rows have validation issues and will be skipped. 
                    Common issues include missing required fields or invalid phone numbers.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={importing}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={!projectId || !file || !preview || importing}
          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {importing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
              Importing...
            </>
          ) : (
            `Import ${preview?.valid || 0} Contacts`
          )}
        </button>
      </div>
    </div>
  )
}