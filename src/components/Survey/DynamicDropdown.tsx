import React, { useEffect, useState } from 'react'
import { useLookups } from '../../hooks/useLookups'
import { SurveyJSChoice } from '../../types/lookup'

interface DynamicDropdownProps {
  namespace: string
  parentKey?: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchEnabled?: boolean
  disabled?: boolean
  className?: string
}

export const DynamicDropdown: React.FC<DynamicDropdownProps> = ({
  namespace,
  parentKey,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchEnabled = false,
  disabled = false,
  className = ''
}) => {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  const { data: choices = [], isLoading, error } = useLookups({
    namespace,
    parent_key: parentKey,
    search: searchEnabled ? search : undefined,
    size: 100
  })

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setIsOpen(false)
    setSearch('')
  }

  const selectedChoice = choices.find(c => c.value === value)

  if (error) {
    return (
      <div className={`dynamic-dropdown error ${className}`}>
        Error loading options
      </div>
    )
  }

  return (
    <div className={`dynamic-dropdown ${className}`}>
      <div className="dropdown-container">
        {searchEnabled && isOpen ? (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search..."
            className="dropdown-search"
            autoFocus
            disabled={disabled}
          />
        ) : (
          <button
            className="dropdown-trigger"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled || isLoading}
          >
            {isLoading ? 'Loading...' : (selectedChoice?.text || placeholder)}
            <span className="dropdown-arrow">▼</span>
          </button>
        )}
        
        {isOpen && !isLoading && (
          <div className="dropdown-menu">
            {choices.length === 0 ? (
              <div className="dropdown-empty">No options available</div>
            ) : (
              choices.map((choice) => (
                <div
                  key={choice.value}
                  className={`dropdown-item ${value === choice.value ? 'selected' : ''}`}
                  onClick={() => handleSelect(choice.value)}
                >
                  {choice.text}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DynamicDropdown