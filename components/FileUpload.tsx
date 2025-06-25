
import React, { useState, useCallback } from 'react';
import { UploadIcon } from '../constants'; // Assuming UploadIcon is defined in constants.tsx

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  label?: string;
  acceptedFileTypes?: string; // e.g., "image/*,.pdf"
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, label = "Upload a file", acceptedFileTypes }) => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileUpload(file);
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      setFileName(file.name);
      onFileUpload(file);
      event.dataTransfer.clearData();
    }
  }, [onFileUpload]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="mb-4">
      {label && <span className="block text-sm font-medium text-text-secondary mb-1">{label}</span>}
      <div 
        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-brand-blue transition-colors"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <div className="space-y-1 text-center">
          <UploadIcon />
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white rounded-md font-medium text-brand-blue hover:text-brand-blue-light focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-blue"
            >
              <span>Upload a file</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept={acceptedFileTypes} />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          {fileName ? (
            <p className="text-xs text-gray-500">{fileName}</p>
          ) : (
            <p className="text-xs text-gray-500">PDF, DOCX, PNG, JPG up to 10MB (simulated)</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
