import React, { useState } from 'react';
import { Software, PaymentFrequency, NoticePeriod, LicenseType } from '../types';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';
import CurrencyInput from './CurrencyInput';
import { renewContract } from '../services/apiService';
import { DEFAULT_NOTICE_PERIODS, DEFAULT_PAYMENT_FREQUENCIES } from '../constants';

interface ContractRenewalModalProps {
  software: Software;
  isOpen: boolean;
  onClose: () => void;
  onRenewalComplete: (updatedSoftware: Software) => void;
}

const ContractRenewalModal: React.FC<ContractRenewalModalProps> = ({
  software,
  isOpen,
  onClose,
  onRenewalComplete
}) => {
  const [formData, setFormData] = useState({
    contractStartDate: new Date().toISOString().split('T')[0],
    renewalDate: (() => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      return nextYear.toISOString().split('T')[0];
    })(),
    cost: software.cost,
    paymentFrequency: software.paymentFrequency,
    noticePeriod: software.noticePeriod,
    autoRenewal: software.autoRenewal,
    notes: '',
    // License fields
    seatsPurchased: software.seatsPurchased,
    seatsUtilized: software.seatsUtilized,
    usageMetric: software.usageMetric,
    usageLimit: software.usageLimit,
    currentUsage: software.currentUsage,
    sitesLicensed: software.sitesLicensed,
    licenseNotes: software.licenseNotes
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'seatsPurchased' || name === 'seatsUtilized' || name === 'usageLimit' || name === 'currentUsage' || name === 'sitesLicensed') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseInt(value, 10) }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await renewContract(software.id, formData);
      onRenewalComplete(response.software);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to renew contract');
    } finally {
      setIsLoading(false);
    }
  };

  const costDifference = formData.cost - software.cost;
  const costChangePercentage = software.cost > 0 ? ((costDifference / software.cost) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Renew Contract - ${software.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
          <h4 className="font-medium">Current Contract Terms</h4>
          <div className="mt-2 text-sm">
            <p>Contract Period: {software.contractStartDate.split('T')[0]} - {software.renewalDate.split('T')[0]}</p>
            <p>Current Cost: ${software.cost.toLocaleString()} {software.paymentFrequency}</p>
            <p>Notice Period: {software.noticePeriod}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="New Contract Start Date"
            name="contractStartDate"
            type="date"
            value={formData.contractStartDate}
            onChange={handleChange}
            required
          />
          <Input
            label="New Renewal Date"
            name="renewalDate"
            type="date"
            value={formData.renewalDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CurrencyInput
              label="New Cost"
              name="cost"
              value={formData.cost || 0}
              onChange={handleChange}
              required
            />
            {costDifference !== 0 && (
              <p className={`text-sm mt-1 ${costDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {costDifference > 0 ? '+' : ''}${Math.abs(costDifference).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                ({costChangePercentage > 0 ? '+' : ''}{costChangePercentage.toFixed(1)}%)
              </p>
            )}
          </div>
          <Select
            label="Payment Frequency"
            name="paymentFrequency"
            value={formData.paymentFrequency}
            onChange={handleChange}
            options={DEFAULT_PAYMENT_FREQUENCIES}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Notice Period"
            name="noticePeriod"
            value={formData.noticePeriod}
            onChange={handleChange}
            options={DEFAULT_NOTICE_PERIODS}
          />
          <div className="flex items-center pt-6">
            <input
              id="autoRenewal"
              name="autoRenewal"
              type="checkbox"
              checked={formData.autoRenewal}
              onChange={handleChange}
              className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
            />
            <label htmlFor="autoRenewal" className="ml-2 block text-sm text-text-primary">
              Auto-Renew?
            </label>
          </div>
        </div>

        {/* License-specific fields based on software license type */}
        {software.licenseType === LicenseType.PER_USER_SEAT && (
          <div className="border-l-2 border-brand-blue-light pl-4 ml-2">
            <h4 className="font-medium text-sm text-text-primary mb-3">License Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Seats Purchased"
                name="seatsPurchased"
                type="number"
                value={formData.seatsPurchased === undefined ? '' : formData.seatsPurchased}
                onChange={handleChange}
                min="0"
              />
              <Input
                label="Seats Utilized"
                name="seatsUtilized"
                type="number"
                value={formData.seatsUtilized === undefined ? '' : formData.seatsUtilized}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>
        )}

        {software.licenseType === LicenseType.USAGE_BASED && (
          <div className="border-l-2 border-brand-blue-light pl-4 ml-2">
            <h4 className="font-medium text-sm text-text-primary mb-3">Usage Details</h4>
            <Input
              label="Usage Metric"
              name="usageMetric"
              value={formData.usageMetric || ''}
              onChange={handleChange}
              placeholder="e.g., API calls, Storage GB, Transactions"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <Input
                label="Usage Limit"
                name="usageLimit"
                type="number"
                value={formData.usageLimit === undefined ? '' : formData.usageLimit}
                onChange={handleChange}
                min="0"
                placeholder="Maximum allowed usage"
              />
              <Input
                label="Current Usage"
                name="currentUsage"
                type="number"
                value={formData.currentUsage === undefined ? '' : formData.currentUsage}
                onChange={handleChange}
                min="0"
                placeholder="Current usage amount"
              />
            </div>
          </div>
        )}

        {software.licenseType === LicenseType.SITE_LICENSE && (
          <div className="border-l-2 border-brand-blue-light pl-4 ml-2">
            <h4 className="font-medium text-sm text-text-primary mb-3">Site License Details</h4>
            <Input
              label="Sites Licensed"
              name="sitesLicensed"
              type="number"
              value={formData.sitesLicensed === undefined ? '' : formData.sitesLicensed}
              onChange={handleChange}
              min="1"
            />
          </div>
        )}

        {(software.licenseType === LicenseType.PERPETUAL || 
          software.licenseType === LicenseType.FREEMIUM || 
          software.licenseType === LicenseType.OTHER) && (
          <div className="border-l-2 border-brand-blue-light pl-4 ml-2">
            <h4 className="font-medium text-sm text-text-primary mb-3">License Details</h4>
            <Textarea
              label="License Notes"
              name="licenseNotes"
              value={formData.licenseNotes || ''}
              onChange={handleChange}
              placeholder="Additional details about the license terms, restrictions, or special conditions"
              rows={3}
            />
          </div>
        )}

        <Textarea
          label="Renewal Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Optional notes about this renewal (changes made, negotiations, etc.)"
          rows={3}
        />

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Renewing...' : 'Renew Contract'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ContractRenewalModal;