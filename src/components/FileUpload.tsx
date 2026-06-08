'use client'

import { useCallback, useState } from 'react'

interface Props {
  onFileSelect: (file: File) => void
  disabled?: boolean
  inputId?: string
  placeholder?: string
}

export default function FileUpload({ onFileSelect, disabled, inputId = 'file-input', placeholder = '上传Excel' }: Props) {
  const [fileName, setFileName] = useState('')

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setFileName(file.name)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  return (
    <label
      htmlFor={inputId}
      className={`flex items-center gap-2 cursor-pointer group ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        type="file"
        accept=".xls,.xlsx"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        id={inputId}
      />
      <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-500 group-hover:border-blue-400 group-hover:text-blue-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="truncate max-w-[180px]">{fileName || placeholder}</span>
      </div>
    </label>
  )
}
