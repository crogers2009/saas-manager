import React from 'react';
import { SelectOption } from '../types';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  containerClassName?: string;
  placeholder?: string; // Added placeholder prop
}

const Select: React.FC<SelectProps> = ({ label, id, options, error, className = '', containerClassName = '', placeholder, ...props }) => {
  const baseSelectClasses = "block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm rounded-md shadow-sm";
  const errorSelectClasses = "border-red-500 focus:ring-red-500 focus:border-red-500";

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>}
      <select
        id={id}
        className={`${baseSelectClasses} ${error ? errorSelectClasses : ''} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Select;