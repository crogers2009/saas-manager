import React, { useState, useEffect } from 'react';
import { Audit, Software, LicenseType } from '../types';
import Input from './Input';
import Textarea from './Textarea';
import Button from './Button';
import Card from './Card';

interface AuditCompletionFormProps {
  audit: Audit;
  software: Software;
  onSubmit: (completedAudit: Audit, updatedSoftware?: Partial<Software>) => Promise<void>;
  onCancel: () => void;
}

const AuditCompletionForm: React.FC<AuditCompletionFormProps> = ({ 
  audit, 
  software, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<Partial<Audit>>({
    ...audit,
    completedDate: new Date().toISOString(),
    currentSeatsUsed: software.seatsUtilized,
    currentUsageAmount: software.currentUsage,
    usageMetricSnapshot: software.usageMetric,
    checklist: {
      ...audit.checklist,
      verifyActiveUsersCompleted: false,
      checkSeatUtilizationCompleted: false,
      reviewFeatureUsageCompleted: false,
      updateDepartmentAllocationCompleted: false,
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? undefined : parseInt(value, 10)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleChecklistChange = (checklistItem: string, completed: boolean) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist!,
        [`${checklistItem}Completed`]: completed
      }
    }));
  };

  const isChecklistComplete = () => {
    const checklist = formData.checklist;
    if (!checklist) return false;

    const requiredItems = [];
    if (checklist.verifyActiveUsers) requiredItems.push(checklist.verifyActiveUsersCompleted);
    if (checklist.checkSeatUtilization) requiredItems.push(checklist.checkSeatUtilizationCompleted);
    if (checklist.reviewFeatureUsage) requiredItems.push(checklist.reviewFeatureUsageCompleted);
    if (checklist.updateDepartmentAllocation) requiredItems.push(checklist.updateDepartmentAllocationCompleted);

    return requiredItems.length > 0 && requiredItems.every(item => item === true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isChecklistComplete()) {
      alert('Please complete all required checklist items before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare software updates based on audit data
      const updatedSoftware: Partial<Software> = {};
      
      if (software.licenseType === LicenseType.PER_USER_SEAT && formData.currentSeatsUsed !== undefined) {
        updatedSoftware.seatsUtilized = formData.currentSeatsUsed;
      }
      
      if (software.licenseType === LicenseType.USAGE_BASED && formData.currentUsageAmount !== undefined) {
        updatedSoftware.currentUsage = formData.currentUsageAmount;
        if (formData.usageMetricSnapshot) {
          updatedSoftware.usageMetric = formData.usageMetricSnapshot;
        }
      }
      
      await onSubmit(formData as Audit, Object.keys(updatedSoftware).length > 0 ? updatedSoftware : undefined);
    } catch (error) {
      console.error('Error completing audit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ChecklistItem: React.FC<{ 
    label: string; 
    itemKey: string; 
    required: boolean;
    completed: boolean;
    onToggle: (completed: boolean) => void;
  }> = ({ label, itemKey, required, completed, onToggle }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-200">
      <div className="flex items-center">
        <span className={`text-sm ${required ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        {!required && <span className="text-xs text-text-secondary ml-2">(Optional)</span>}
      </div>
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
          disabled={!required}
        />
        <span className="ml-2 text-sm text-text-primary">
          {completed ? 'Completed' : 'Pending'}
        </span>
      </label>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card title={`Complete Audit: ${software.name}`} subtitle={`Scheduled: ${new Date(audit.scheduledDate).toLocaleDateString()}`}>
        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Software Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
            <div><strong>Vendor:</strong> {software.vendor}</div>
            <div><strong>License Type:</strong> {software.licenseType}</div>
            <div><strong>Owner:</strong> {software.ownerId}</div>
            <div><strong>Status:</strong> {software.status}</div>
          </div>
        </div>

        {/* Audit Checklist */}
        <div className="mb-6">
          <h4 className="text-lg font-medium text-text-primary mb-4">Audit Checklist</h4>
          
          <ChecklistItem
            label="Verify Active Users"
            itemKey="verifyActiveUsers"
            required={formData.checklist?.verifyActiveUsers || false}
            completed={formData.checklist?.verifyActiveUsersCompleted || false}
            onToggle={(completed) => handleChecklistChange('verifyActiveUsers', completed)}
          />

          {software.licenseType === LicenseType.PER_USER_SEAT && (
            <ChecklistItem
              label="Check Seat Utilization"
              itemKey="checkSeatUtilization"
              required={formData.checklist?.checkSeatUtilization || false}
              completed={formData.checklist?.checkSeatUtilizationCompleted || false}
              onToggle={(completed) => handleChecklistChange('checkSeatUtilization', completed)}
            />
          )}

          <ChecklistItem
            label="Review Feature Usage"
            itemKey="reviewFeatureUsage"
            required={formData.checklist?.reviewFeatureUsage || false}
            completed={formData.checklist?.reviewFeatureUsageCompleted || false}
            onToggle={(completed) => handleChecklistChange('reviewFeatureUsage', completed)}
          />

          <ChecklistItem
            label="Update Department Allocation"
            itemKey="updateDepartmentAllocation"
            required={formData.checklist?.updateDepartmentAllocation || false}
            completed={formData.checklist?.updateDepartmentAllocationCompleted || false}
            onToggle={(completed) => handleChecklistChange('updateDepartmentAllocation', completed)}
          />
        </div>

        {/* Current Usage Data */}
        {software.licenseType === LicenseType.PER_USER_SEAT && (
          <div className="mb-6">
            <h4 className="text-lg font-medium text-text-primary mb-4">🎯 Update Current Seat Usage</h4>
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> This data will update the software record to keep utilization tracking accurate.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Current Seats Used"
                name="currentSeatsUsed"
                type="number"
                value={formData.currentSeatsUsed || ''}
                onChange={handleInputChange}
                placeholder="Enter current seat usage"
                min="0"
                max={software.seatsPurchased}
                required
              />
              <div className="space-y-2 pt-6">
                <div className="text-sm text-text-secondary">
                  <strong>Purchased:</strong> {software.seatsPurchased} seats
                </div>
                <div className="text-sm text-text-secondary">
                  <strong>Previous Usage:</strong> {software.seatsUtilized || 0} seats
                </div>
                {formData.currentSeatsUsed && software.seatsPurchased && (
                  <div className={`text-sm font-medium ${
                    (formData.currentSeatsUsed / software.seatsPurchased) > 0.9 ? 'text-red-600' :
                    (formData.currentSeatsUsed / software.seatsPurchased) > 0.75 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    <strong>New Utilization:</strong> {Math.round((formData.currentSeatsUsed / software.seatsPurchased) * 100)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {software.licenseType === LicenseType.USAGE_BASED && (
          <div className="mb-6">
            <h4 className="text-lg font-medium text-text-primary mb-4">📊 Update Current Usage Data</h4>
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> This data will update the software record to keep usage tracking accurate.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={`Current ${software.usageMetric || 'Usage'}`}
                name="currentUsageAmount"
                type="number"
                value={formData.currentUsageAmount || ''}
                onChange={handleInputChange}
                placeholder="Enter current usage amount"
                min="0"
                max={software.usageLimit}
                required
              />
              <Input
                label="Usage Metric"
                name="usageMetricSnapshot"
                value={formData.usageMetricSnapshot || ''}
                onChange={handleInputChange}
                placeholder="What is being measured"
              />
            </div>
            <div className="mt-4 space-y-2">
              {software.usageLimit && (
                <div className="text-sm text-text-secondary">
                  <strong>Usage Limit:</strong> {software.usageLimit.toLocaleString()} {software.usageMetric}
                </div>
              )}
              <div className="text-sm text-text-secondary">
                <strong>Previous Usage:</strong> {software.currentUsage || 0} {software.usageMetric}
              </div>
              {formData.currentUsageAmount && software.usageLimit && (
                <div className={`text-sm font-medium ${
                  (formData.currentUsageAmount / software.usageLimit) > 0.9 ? 'text-red-600' :
                  (formData.currentUsageAmount / software.usageLimit) > 0.75 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  <strong>New Utilization:</strong> {Math.round((formData.currentUsageAmount / software.usageLimit) * 100)}%
                </div>
              )}
            </div>
          </div>
        )}

        {/* Findings and Recommendations */}
        <div className="mb-6">
          <h4 className="text-lg font-medium text-text-primary mb-4">Audit Findings & Recommendations</h4>
          <div className="space-y-4">
            <Textarea
              label="Audit Findings"
              name="auditFindings"
              value={formData.auditFindings || ''}
              onChange={handleInputChange}
              placeholder="Document any findings, issues, or observations from this audit..."
              rows={3}
            />
            <Textarea
              label="Recommended Actions"
              name="recommendedActions"
              value={formData.recommendedActions || ''}
              onChange={handleInputChange}
              placeholder="List any recommended actions based on the audit findings..."
              rows={3}
            />
            <Textarea
              label="Additional Notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleInputChange}
              placeholder="Any additional notes or comments..."
              rows={2}
            />
          </div>
        </div>

        {/* Completion Status */}
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              Audit Completion Status:
            </span>
            <span className={`text-sm font-medium ${
              isChecklistComplete() ? 'text-green-600' : 'text-orange-600'
            }`}>
              {isChecklistComplete() ? 'Ready to Complete' : 'Pending Items'}
            </span>
          </div>
          {!isChecklistComplete() && (
            <p className="text-xs text-text-secondary mt-1">
              Complete all required checklist items before submitting.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting || !isChecklistComplete()}
          >
            Complete Audit
          </Button>
        </div>
      </Card>
    </form>
  );
};

export default AuditCompletionForm;