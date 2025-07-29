
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, actions }) => {
  return (
    <div className={`bg-white shadow-md rounded-lg ${className}`} style={{ overflow: 'visible' }}>
      {(title || actions) && (
        <div className="px-4 py-3 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          {title && <h3 className="text-lg leading-6 font-medium text-text-primary">{title}</h3>}
          {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
