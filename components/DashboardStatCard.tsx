
import React from 'react';
import Card from './Card';

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  color?: string; // Tailwind color class for icon/accent
}

const DashboardStatCard: React.FC<DashboardStatCardProps> = ({ title, value, icon, description, color = 'text-brand-blue' }) => {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary truncate">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-text-primary">{value}</p>
        </div>
        {icon && (
          <div className={`p-3 rounded-md bg-opacity-20 ${color.replace('text-', 'bg-')}`}>
            <div className={`h-6 w-6 ${color}`}>{icon}</div>
          </div>
        )}
      </div>
      {description && (
        <div className="mt-4">
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
      )}
    </Card>
  );
};

export default DashboardStatCard;
