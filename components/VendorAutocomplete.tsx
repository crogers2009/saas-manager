import React, { useState, useEffect, useRef } from 'react';

export interface VendorInfo {
  vendor: string;
  accountExecutive?: string;
  accountExecutiveEmail?: string;
  supportWebsite?: string;
  supportEmail?: string;
}

interface VendorAutocompleteProps {
  label: string;
  value: string;
  onChange: (vendor: string, vendorInfo?: VendorInfo) => void;
  error?: string;
  required?: boolean;
  existingVendors: VendorInfo[];
}

const VendorAutocomplete: React.FC<VendorAutocompleteProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
  existingVendors
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredVendors, setFilteredVendors] = useState<VendorInfo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const filtered = existingVendors.filter(vendor =>
        vendor.vendor.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors(existingVendors);
    }
  }, [value, existingVendors]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  const handleVendorSelect = (vendorInfo: VendorInfo) => {
    onChange(vendorInfo.vendor, vendorInfo);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && filteredVendors.length > 0) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-text-primary mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholder="Enter vendor name..."
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && filteredVendors.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredVendors.map((vendor, index) => (
            <div
              key={index}
              onClick={() => handleVendorSelect(vendor)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-text-primary">{vendor.vendor}</div>
              {vendor.accountExecutive && (
                <div className="text-sm text-text-secondary mt-1">
                  Contact: {vendor.accountExecutive}
                  {vendor.accountExecutiveEmail && ` (${vendor.accountExecutiveEmail})`}
                </div>
              )}
              {vendor.supportEmail && (
                <div className="text-sm text-text-secondary">
                  Support: {vendor.supportEmail}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && filteredVendors.length === 0 && value && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
        >
          <div className="px-4 py-3 text-text-secondary">
            No existing vendors found. Press Enter to add "{value}" as a new vendor.
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorAutocomplete;