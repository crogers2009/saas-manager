
import React from 'react';

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, actions }) => {
  return (
    <div className="bg-white shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-text-primary sm:text-3xl sm:truncate">
              {title}
            </h2>
          </div>
          {actions && (
            <div className="mt-4 flex md:mt-0 md:ml-4">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
