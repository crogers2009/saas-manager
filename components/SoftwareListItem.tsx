
import React from 'react';
import { Link } from 'react-router-dom';
import { Software, Department, User, FeatureTag, SoftwareStatus, PaymentFrequency, LicenseType } from '../types';
import Badge from './Badge';
import Button from './Button'; // Added import for Button
import { SoftwareIcon, EditIcon, TrashIcon } from '../constants'; // Assuming icons are in constants
import { formatDateSafely } from '../utils/dateUtils';

interface SoftwareListItemProps {
  software: Software;
  departments: Department[];
  owner?: User;
  featureTags: FeatureTag[];
  onDelete: (id: string) => void;
}

const SoftwareListItem: React.FC<SoftwareListItemProps> = ({ software, departments, owner, featureTags, onDelete }) => {
  
  const getStatusColor = (status: SoftwareStatus): 'green' | 'yellow' | 'gray' => {
    switch (status) {
      case SoftwareStatus.ACTIVE: return 'green';
      case SoftwareStatus.PENDING_APPROVAL: return 'yellow';
      case SoftwareStatus.INACTIVE: return 'gray';
      default: return 'gray';
    }
  };

  const softwareDepartments = software.departmentIds
    .map(id => departments.find(d => d.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  const softwareTags = software.featureTagIds
    .map(id => featureTags.find(t => t.id === id)?.name)
    .filter(Boolean);

  const costDisplay = () => {
    if (software.licenseType === LicenseType.PER_USER_SEAT && software.seatsPurchased && software.seatsPurchased > 0) {
      const costPerSeat = (software.cost / software.seatsPurchased).toFixed(2);
      return `$${costPerSeat} / seat / ${software.paymentFrequency.toLowerCase()}`;
    }
    return `$${software.cost.toLocaleString()} / ${software.paymentFrequency.toLowerCase()}`;
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex-grow mb-2 sm:mb-0">
          <div className="flex items-center mb-1">
            <span className="text-brand-blue mr-2"><SoftwareIcon/></span>
            <Link to={`/software/${software.id}`} className="text-xl font-semibold text-brand-blue hover:underline">
              {software.name}
            </Link>
            <Badge text={software.status} color={getStatusColor(software.status)} size="sm" dot className="ml-3" />
          </div>
          <p className="text-sm text-text-secondary">Vendor: {software.vendor}</p>
          <p className="text-sm text-text-secondary">Owner: {owner?.name || 'N/A'}</p>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-2">
          <Link to={`/software/${software.id}/edit`}>
            <Button variant="outline" size="sm" leftIcon={<EditIcon />}>Edit</Button>
          </Link>
          <Button variant="danger" size="sm" leftIcon={<TrashIcon />} onClick={() => onDelete(software.id)}>Delete</Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="font-medium text-text-primary">Cost</p>
          <p className="text-text-secondary">{costDisplay()}</p>
        </div>
        <div>
          <p className="font-medium text-text-primary">License Type</p>
          <p className="text-text-secondary">{software.licenseType || 'N/A'}</p>
        </div>
        <div>
          <p className="font-medium text-text-primary">Renewal Date</p>
          <p className="text-text-secondary">{formatDateSafely(software.renewalDate, 'MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="font-medium text-text-primary">Departments</p>
          <p className="text-text-secondary truncate" title={softwareDepartments}>{softwareDepartments || 'N/A'}</p>
        </div>
      </div>

      {/* Contact & Support Information - Only show if any fields have data */}
      {(software.accountExecutive || software.accountExecutiveEmail || software.supportWebsite || software.supportEmail) && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {software.accountExecutive && (
            <div>
              <p className="font-medium text-text-primary">Account Executive</p>
              <p className="text-text-secondary">{software.accountExecutive}</p>
            </div>
          )}
          {software.accountExecutiveEmail && (
            <div>
              <p className="font-medium text-text-primary">AE Email</p>
              <a href={`mailto:${software.accountExecutiveEmail}`} className="text-brand-blue hover:underline text-sm">
                {software.accountExecutiveEmail}
              </a>
            </div>
          )}
          {software.supportWebsite && (
            <div>
              <p className="font-medium text-text-primary">Support</p>
              <a href={software.supportWebsite} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline text-sm">
                Support Portal
              </a>
            </div>
          )}
          {software.supportEmail && (
            <div>
              <p className="font-medium text-text-primary">Support Email</p>
              <a href={`mailto:${software.supportEmail}`} className="text-brand-blue hover:underline text-sm">
                {software.supportEmail}
              </a>
            </div>
          )}
        </div>
      )}
      
      {softwareTags.length > 0 && (
        <div className="mt-3">
            <p className="font-medium text-text-primary text-sm mb-1">Features</p>
            <div className="flex flex-wrap gap-1">
            {softwareTags.map(tag => (
                <Badge key={tag} text={tag} color="indigo" size="sm" />
            ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default SoftwareListItem;
