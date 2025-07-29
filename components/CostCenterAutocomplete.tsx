import React, { useState, useEffect, useRef } from 'react';
import { CostCenter } from '../types';

interface CostCenterAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  costCenters: CostCenter[];
  error?: string;
  required?: boolean;
  placeholder?: string;
}

const CostCenterAutocomplete: React.FC<CostCenterAutocompleteProps> = ({
  label,
  value,
  onChange,
  costCenters,
  error,
  required = false,
  placeholder = "Type code or name..."
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter cost centers based on input
  const filteredCostCenters = costCenters.filter(cc => 
    cc.code.toLowerCase().includes(inputValue.toLowerCase()) ||
    cc.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Update input value when prop value changes
  useEffect(() => {
    if (value) {
      const costCenter = costCenters.find(cc => cc.code === value);
      setInputValue(costCenter ? `${costCenter.code} - ${costCenter.name}` : value);
    } else {
      setInputValue('');
    }
  }, [value, costCenters]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // If input is empty, clear the selection
    if (!newValue.trim()) {
      onChange('');
    }
  };

  const handleSelectCostCenter = (costCenter: CostCenter) => {
    setInputValue(`${costCenter.code} - ${costCenter.name}`);
    onChange(costCenter.code);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCostCenters.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCostCenters.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCostCenters[highlightedIndex]) {
          handleSelectCostCenter(filteredCostCenters[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay closing to allow for clicks on list items
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
      
      // If input doesn't match any cost center, try to find partial match
      if (inputValue && !costCenters.find(cc => cc.code === value)) {
        const match = costCenters.find(cc => 
          cc.code.toLowerCase().includes(inputValue.toLowerCase()) ||
          cc.name.toLowerCase().includes(inputValue.toLowerCase())
        );
        
        if (match) {
          setInputValue(`${match.code} - ${match.name}`);
          onChange(match.code);
        } else {
          // Reset to original value if no match found
          const originalCostCenter = costCenters.find(cc => cc.code === value);
          setInputValue(originalCostCenter ? `${originalCostCenter.code} - ${originalCostCenter.name}` : '');
        }
      }
    }, 150);
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="relative" style={{ zIndex: isOpen ? 1000 : 'auto' }}>
      <label htmlFor={`cost-center-${label}`} className="block text-sm font-medium text-text-primary mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative" style={{ overflow: 'visible' }}>
        <input
          ref={inputRef}
          id={`cost-center-${label}`}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          required={required}
          autoComplete="off"
        />
        
        {isOpen && filteredCostCenters.length > 0 && (
          <ul
            ref={listRef}
            className="absolute w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
            style={{ zIndex: 9999 }}
          >
            {filteredCostCenters.map((costCenter, index) => (
              <li
                key={costCenter.id}
                onClick={() => handleSelectCostCenter(costCenter)}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                  index === highlightedIndex ? 'bg-blue-50 text-blue-900' : ''
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-sm">{costCenter.code}</span>
                    <span className="text-gray-600 text-sm ml-2">{costCenter.name}</span>
                  </div>
                </div>
                {costCenter.description && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {costCenter.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        
        {isOpen && filteredCostCenters.length === 0 && inputValue.trim() && (
          <div className="absolute w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg" style={{ zIndex: 9999 }}>
            <div className="px-3 py-2 text-sm text-gray-500">
              No cost centers found matching "{inputValue}"
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CostCenterAutocomplete;