import React, { useState, useEffect } from 'react';
import { FeatureTag } from '../types';
import Badge from './Badge';
import Input from './Input';
import Button from './Button';

interface TagInputProps {
  availableTags: FeatureTag[];
  selectedTagIds: string[];
  onChange: (newSelectedTagIds: string[]) => void;
  onNewTag?: (tagName: string) => Promise<FeatureTag | undefined>; // Optional: for creating new tags
}

const TagInput: React.FC<TagInputProps> = ({ availableTags, selectedTagIds, onChange, onNewTag }) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSelectTag = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      onChange([...selectedTagIds, tagId]);
    }
    setShowDropdown(false);
    setInputValue('');
  };

  const handleRemoveTag = (tagIdToRemove: string) => {
    onChange(selectedTagIds.filter(id => id !== tagIdToRemove));
  };

  const handleAddNewTag = async () => {
    if (inputValue.trim() && onNewTag) {
      const newTag = await onNewTag(inputValue.trim());
      if (newTag && !selectedTagIds.includes(newTag.id)) {
        onChange([...selectedTagIds, newTag.id]);
      }
      setInputValue('');
      setShowDropdown(false);
    }
  };
  
  const filteredAvailableTags = availableTags.filter(
    tag => !selectedTagIds.includes(tag.id) && tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="relative mb-4">
      <label className="block text-sm font-medium text-text-secondary mb-1">Feature Tags</label>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[40px]">
        {selectedTagIds.map(tagId => {
          const tag = availableTags.find(t => t.id === tagId);
          return tag ? (
            <Badge key={tag.id} text={tag.name} color="blue">
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1.5 text-blue-400 hover:text-blue-600 focus:outline-none"
              >
                &times;
              </button>
            </Badge>
          ) : null;
        })}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          // onBlur={() => setTimeout(() => setShowDropdown(false), 100)} // Delay to allow click on dropdown
          placeholder="Add or search tags..."
          className="flex-grow p-1 outline-none text-sm"
        />
      </div>
      {showDropdown && (filteredAvailableTags.length > 0 || (onNewTag && inputValue.trim())) && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredAvailableTags.map(tag => (
            <div
              key={tag.id}
              onClick={() => handleSelectTag(tag.id)}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              {tag.name}
            </div>
          ))}
          {onNewTag && inputValue.trim() && !filteredAvailableTags.some(t => t.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
             <div
              onClick={handleAddNewTag}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-brand-blue"
            >
              Create new tag: "{inputValue.trim()}"
            </div>
          )}
        </div>
      )}
       {showDropdown && <button type="button" onClick={()=>setShowDropdown(false)} className="fixed inset-0 h-full w-full cursor-default -z-10"></button>}
    </div>
  );
};

export default TagInput;