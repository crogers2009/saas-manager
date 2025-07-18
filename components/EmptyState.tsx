
import React from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, message, action }) => {
  return (
    <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-white">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
      <h3 className="mt-2 text-xl font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

export default EmptyState;
