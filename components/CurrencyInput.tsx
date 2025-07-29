import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  label: string;
  name: string;
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  placeholder = "0.00",
  className = ""
}) => {
  const [displayValue, setDisplayValue] = useState('');

  // Format number to currency display (with commas, no $)
  const formatCurrency = (num: number): string => {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Parse currency string back to number
  const parseCurrency = (str: string): number => {
    const cleaned = str.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Update display value when prop value changes
  useEffect(() => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    if (numValue === 0 && displayValue === '') {
      // Don't format empty initial values
      return;
    }
    setDisplayValue(formatCurrency(numValue));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow typing without formatting until user finishes
    setDisplayValue(inputValue);
    
    // Create a synthetic event with the numeric value for the parent
    const numericValue = parseCurrency(inputValue);
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        name,
        value: numericValue.toString(),
        type: 'number'
      }
    };
    
    onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
  };

  const handleBlur = () => {
    // Format the display value on blur
    const numValue = parseCurrency(displayValue);
    setDisplayValue(formatCurrency(numValue));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Remove formatting on focus for easier editing
    const numValue = parseCurrency(displayValue);
    if (numValue === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(numValue.toString());
    }
    e.target.select(); // Select all text for easy replacement
  };

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-text-primary mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">$</span>
        </div>
        <input
          type="text"
          id={name}
          name={name}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`block w-full pl-7 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          required={required}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CurrencyInput;