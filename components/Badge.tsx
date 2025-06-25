import React from 'react';

interface BadgeProps {
  text: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'indigo' | 'purple' | 'pink';
  size?: 'sm' | 'md';
  dot?: boolean;
  children?: React.ReactNode; // Added for embedding elements like close buttons
  className?: string; // Added for custom styling
}

const Badge: React.FC<BadgeProps> = ({ text, color = 'gray', size = 'md', dot = false, children, className = '' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    purple: 'bg-purple-100 text-purple-800',
    pink: 'bg-pink-100 text-pink-800',
  };

  const dotColorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm';

  return (
    <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full ${colorClasses[color]} ${className}`}>
      {dot && <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColorClasses[color]}`} fill="currentColor" viewBox="0 0 8 8"><circle cx={4} cy={4} r={3} /></svg>}
      {text}
      {children}
    </span>
  );
};

export default Badge;