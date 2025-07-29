
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Software, User, Department, FeatureTag, SelectOption, SoftwareStatus, PaymentFrequency, NoticePeriod, DocumentFile, DocumentType, Integration, LicenseType, AuditFrequency, UserRole, CostCenter } from '../types';
import Input from './Input';
import Textarea from './Textarea';
import Select from './Select';
import Button from './Button';
import Card from './Card';
import TagInput from './TagInput';
import FileUpload from './FileUpload';
import Badge from './Badge';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import VendorAutocomplete, { VendorInfo } from './VendorAutocomplete';
import CostCenterAutocomplete from './CostCenterAutocomplete';
import { getUsers, getDepartments, getFeatureTags, addFeatureTag as apiAddFeatureTag, getSoftwareList, apiRequest, getCostCenters } from '../services/apiService';
import { DEFAULT_NOTICE_PERIODS, DEFAULT_PAYMENT_FREQUENCIES, DEFAULT_SOFTWARE_STATUSES, DEFAULT_DOCUMENT_TYPES, DEFAULT_LICENSE_TYPES, DEFAULT_AUDIT_FREQUENCIES, PlusIcon, TrashIcon } from '../constants';
import { dateInputToISOString } from '../utils/dateUtils';

interface SoftwareFormProps {
  initialSoftware?: Software;
  onSubmit: (software: Software) => Promise<void>;
  isEditMode: boolean;
}

const SoftwareForm: React.FC<SoftwareFormProps> = ({ initialSoftware, onSubmit, isEditMode }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<Software>>(
    initialSoftware || {
      name: '',
      vendor: '',
      description: '',
      ownerId: '',
      departmentIds: [],
      cost: 0,
      paymentFrequency: PaymentFrequency.MONTHLY,
      status: SoftwareStatus.ACTIVE,
      featureTagIds: [],
      contractStartDate: new Date().toISOString().split('T')[0],
      renewalDate: new Date().toISOString().split('T')[0],
      noticePeriod: NoticePeriod.DAYS_30,
      autoRenewal: false,
      integrations: [],
      documents: [],
      licenseType: LicenseType.PER_USER_SEAT,
      seatsPurchased: undefined,
      seatsUtilized: undefined,
      usageMetric: undefined,
      usageLimit: undefined,
      currentUsage: undefined,
      sitesLicensed: undefined,
      licenseNotes: undefined,
      accountExecutive: undefined,
      accountExecutiveEmail: undefined,
      supportWebsite: undefined,
      supportEmail: undefined,
      auditFrequency: AuditFrequency.QUARTERLY,
    }
  );
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [featureTags, setFeatureTags] = useState<FeatureTag[]>([]);
  const [existingVendors, setExistingVendors] = useState<VendorInfo[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  
  // User creation state
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: ''
  });
  const [userError, setUserError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Software, string>>>({});
  
  // States for new document and integration
  const [newDocument, setNewDocument] = useState<{name: string, type: DocumentType, file?: File} | null>(null);
  const [newIntegration, setNewIntegration] = useState<Partial<Integration>>({ externalIntegrationName: '', notes: '' });


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, d, ft, allSoftware, cc] = await Promise.all([
          getUsers(), 
          getDepartments(), 
          getFeatureTags(),
          getSoftwareList(),
          getCostCenters()
        ]);
        setUsers(u);
        setDepartments(d);
        setFeatureTags(ft);
        setCostCenters(cc);
        
        // Extract unique vendors with their contact information
        const vendorMap = new Map<string, VendorInfo>();
        allSoftware.forEach(software => {
          if (software.vendor && !vendorMap.has(software.vendor)) {
            vendorMap.set(software.vendor, {
              vendor: software.vendor,
              accountExecutive: software.accountExecutive,
              accountExecutiveEmail: software.accountExecutiveEmail,
              supportWebsite: software.supportWebsite,
              supportEmail: software.supportEmail,
            });
          }
        });
        setExistingVendors(Array.from(vendorMap.values()));
        
        if (initialSoftware?.ownerId && !u.find(user => user.id === initialSoftware.ownerId)) {
            setFormData(prev => ({...prev, ownerId: u[0]?.id || ''}))
        } else if (!initialSoftware && u.length > 0) {
           // Set default owner if creating new and users are available
           // setFormData(prev => ({ ...prev, ownerId: u[0].id }));
        }
      } catch (error) {
        console.error("Error fetching form data dependencies:", error);
      }
    };
    fetchData();
  }, [initialSoftware]);

  useEffect(() => {
    if (initialSoftware) {
      setFormData({
        ...initialSoftware,
        contractStartDate: initialSoftware.contractStartDate ? initialSoftware.contractStartDate.split('T')[0] : new Date().toISOString().split('T')[0],
        renewalDate: initialSoftware.renewalDate ? initialSoftware.renewalDate.split('T')[0] : new Date().toISOString().split('T')[0],
        licenseType: initialSoftware.licenseType || LicenseType.PER_USER_SEAT,
        seatsPurchased: initialSoftware.seatsPurchased,
        seatsUtilized: initialSoftware.seatsUtilized,
        usageMetric: initialSoftware.usageMetric,
        usageLimit: initialSoftware.usageLimit,
        currentUsage: initialSoftware.currentUsage,
        sitesLicensed: initialSoftware.sitesLicensed,
        licenseNotes: initialSoftware.licenseNotes,
        accountExecutive: initialSoftware.accountExecutive,
        accountExecutiveEmail: initialSoftware.accountExecutiveEmail,
        supportWebsite: initialSoftware.supportWebsite,
        supportEmail: initialSoftware.supportEmail,
        auditFrequency: initialSoftware.auditFrequency || AuditFrequency.QUARTERLY,
      });
    }
  }, [initialSoftware]);

  const userOptions: SelectOption[] = users
    .filter(u => u.role === 'Software Owner' || u.role === 'Department Head')
    .map(u => ({ value: u.id, label: u.name }));
  const departmentOptions: SelectOption[] = departments.map(d => ({ value: d.id, label: d.name }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'seatsPurchased' || name === 'seatsUtilized' || name === 'usageLimit' || name === 'currentUsage' || name === 'sitesLicensed') {
        setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseInt(value, 10) }));
    } else if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'licenseType') {
        // Clear fields when license type changes
        setFormData(prev => ({
            ...prev,
            licenseType: value as LicenseType,
            seatsPurchased: undefined,
            seatsUtilized: undefined,
            usageMetric: undefined,
            usageLimit: undefined,
            currentUsage: undefined,
            sitesLicensed: undefined,
            licenseNotes: undefined,
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleVendorChange = (vendor: string, vendorInfo?: VendorInfo) => {
    setFormData(prev => ({
      ...prev,
      vendor,
      // Auto-fill contact information if vendor exists
      ...(vendorInfo ? {
        accountExecutive: vendorInfo.accountExecutive || prev.accountExecutive,
        accountExecutiveEmail: vendorInfo.accountExecutiveEmail || prev.accountExecutiveEmail,
        supportWebsite: vendorInfo.supportWebsite || prev.supportWebsite,
        supportEmail: vendorInfo.supportEmail || prev.supportEmail,
      } : {})
    }));
    
    // Clear vendor error when selection is made
    if (errors.vendor) {
      setErrors(prev => ({ ...prev, vendor: undefined }));
    }
  };

  const handleCostCenterChange = (costCenterCode: string) => {
    setFormData(prev => ({
      ...prev,
      costCenterCode
    }));
    
    // Clear cost center error when selection is made
    if (errors.costCenterCode) {
      setErrors(prev => ({ ...prev, costCenterCode: undefined }));
    }
  };

  const handleMultiSelectChange = (name: keyof Software, selectedId: string) => {
    setFormData(prev => {
      const currentValues = (prev[name] as string[] || []);
      const newValues = currentValues.includes(selectedId)
        ? currentValues.filter(id => id !== selectedId)
        : [...currentValues, selectedId];
      return { ...prev, [name]: newValues };
    });
  };

  const handleTagChange = (newSelectedTagIds: string[]) => {
    setFormData(prev => ({ ...prev, featureTagIds: newSelectedTagIds }));
  };

  const handleAddNewTag = async (tagName: string): Promise<FeatureTag | undefined> => {
    try {
      const newTag = await apiAddFeatureTag(tagName);
      if (newTag) {
        setFeatureTags(prev => [...prev, newTag]);
        return newTag;
      }
    } catch (error) {
      console.error("Error adding new tag:", error);
    }
    return undefined;
  };

  const handleDocumentUpload = (file: File) => {
    setNewDocument(prev => ({ name: file.name, type: prev?.type || DocumentType.OTHER, file }));
  };

  const handleAddDocument = () => {
    if (newDocument && newDocument.file) {
        const docToAdd: DocumentFile = {
            id: crypto.randomUUID(), // temporary client-side ID
            name: newDocument.name,
            type: newDocument.type,
            uploadDate: new Date().toISOString(),
            file: newDocument.file, // The actual file object
        };
        setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), docToAdd] }));
        setNewDocument(null); // Reset form
    }
  };

  const handleDeleteDocument = (docId: string) => {
    setFormData(prev => ({ ...prev, documents: prev.documents?.filter(d => d.id !== docId) }));
  };

  const handleAddIntegration = () => {
    if (newIntegration.externalIntegrationName || newIntegration.notes) {
        const integrationToAdd: Integration = {
            id: crypto.randomUUID(),
            externalIntegrationName: newIntegration.externalIntegrationName,
            notes: newIntegration.notes || '',
        };
        setFormData(prev => ({ ...prev, integrations: [...(prev.integrations || []), integrationToAdd] }));
        setNewIntegration({ externalIntegrationName: '', notes: '' }); // Reset form
    }
  };

  const handleDeleteIntegration = (intId: string) => {
    setFormData(prev => ({ ...prev, integrations: prev.integrations?.filter(i => i.id !== intId) }));
  };

  const handleCreateSoftwareOwner = () => {
    setUserFormData({ name: '', email: '' });
    setUserError('');
    setShowUserModal(true);
  };

  const handleUserEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let email = e.target.value;
    setUserFormData(prev => ({ ...prev, email }));
  };

  const handleUserEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let email = e.target.value;
    
    // Auto-append domain on blur if user typed just a username
    if (email && !email.includes('@')) {
      email = email + '@firstacceptance.com';
      setUserFormData(prev => ({ ...prev, email }));
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!userFormData.name.trim() || !userFormData.email.trim()) {
      setUserError('Name and email are required');
      return;
    }

    try {
      const newUser = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: userFormData.name,
          email: userFormData.email,
          role: UserRole.SOFTWARE_OWNER,
          password: 'firstacceptance',
          isActive: true
        })
      });

      // Refresh users list and select the new user
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
      setFormData(prev => ({ ...prev, ownerId: newUser.id }));
      
      setShowUserModal(false);
      setUserFormData({ name: '', email: '' });
      alert('Software Owner created successfully! They will be prompted to change their password on first login.');
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof Software, string>> = {};
    if (!formData.name?.trim()) newErrors.name = "Software name is required.";
    if (!formData.vendor?.trim()) newErrors.vendor = "Vendor is required.";
    if (!formData.ownerId) newErrors.ownerId = "Owner is required.";
    if (formData.cost === undefined || formData.cost < 0) newErrors.cost = "Cost must be a non-negative number.";
    if (!formData.contractStartDate) newErrors.contractStartDate = "Contract start date is required.";
    if (!formData.renewalDate) newErrors.renewalDate = "Renewal date is required.";
    if (!formData.licenseType) newErrors.licenseType = "License type is required.";

    // License type specific validation
    if (formData.licenseType === LicenseType.PER_USER_SEAT) {
        if (formData.seatsPurchased === undefined || formData.seatsPurchased < 0) {
            newErrors.seatsPurchased = "Seats purchased must be a non-negative number.";
        }
        if (formData.seatsUtilized === undefined || formData.seatsUtilized < 0) {
            newErrors.seatsUtilized = "Seats utilized must be a non-negative number.";
        }
        if (formData.seatsUtilized !== undefined && formData.seatsPurchased !== undefined && formData.seatsUtilized > formData.seatsPurchased) {
            newErrors.seatsUtilized = "Seats utilized cannot exceed seats purchased.";
        }
    } else if (formData.licenseType === LicenseType.USAGE_BASED) {
        if (!formData.usageMetric?.trim()) {
            newErrors.usageMetric = "Usage metric is required for usage-based licensing.";
        }
        if (formData.usageLimit !== undefined && formData.usageLimit < 0) {
            newErrors.usageLimit = "Usage limit must be a non-negative number.";
        }
        if (formData.currentUsage !== undefined && formData.currentUsage < 0) {
            newErrors.currentUsage = "Current usage must be a non-negative number.";
        }
    } else if (formData.licenseType === LicenseType.SITE_LICENSE) {
        if (formData.sitesLicensed === undefined || formData.sitesLicensed < 1) {
            newErrors.sitesLicensed = "Number of sites licensed must be at least 1.";
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Ensure all required fields that might be undefined in Partial<Software> have defaults
      const completeFormData: Software = {
        id: initialSoftware?.id || crypto.randomUUID(), // Use existing ID or generate for new
        name: formData.name || '',
        vendor: formData.vendor || '',
        description: formData.description || '',
        ownerId: formData.ownerId || '',
        departmentIds: formData.departmentIds || [],
        cost: formData.cost || 0,
        paymentFrequency: formData.paymentFrequency || PaymentFrequency.MONTHLY,
        status: formData.status || SoftwareStatus.ACTIVE,
        featureTagIds: formData.featureTagIds || [],
        contractStartDate: dateInputToISOString(formData.contractStartDate || ''),
        renewalDate: dateInputToISOString(formData.renewalDate || ''),
        noticePeriod: formData.noticePeriod || NoticePeriod.DAYS_30,
        autoRenewal: formData.autoRenewal || false,
        integrations: formData.integrations || [],
        documents: formData.documents || [],
        licenseType: formData.licenseType || LicenseType.PER_USER_SEAT,
        seatsPurchased: formData.licenseType === LicenseType.PER_USER_SEAT ? formData.seatsPurchased : undefined,
        seatsUtilized: formData.licenseType === LicenseType.PER_USER_SEAT ? formData.seatsUtilized : undefined,
        usageMetric: formData.licenseType === LicenseType.USAGE_BASED ? formData.usageMetric : undefined,
        usageLimit: formData.licenseType === LicenseType.USAGE_BASED ? formData.usageLimit : undefined,
        currentUsage: formData.licenseType === LicenseType.USAGE_BASED ? formData.currentUsage : undefined,
        sitesLicensed: formData.licenseType === LicenseType.SITE_LICENSE ? formData.sitesLicensed : undefined,
        licenseNotes: formData.licenseNotes || undefined,
        accountExecutive: formData.accountExecutive || undefined,
        accountExecutiveEmail: formData.accountExecutiveEmail || undefined,
        supportWebsite: formData.supportWebsite || undefined,
        supportEmail: formData.supportEmail || undefined,
        auditFrequency: formData.auditFrequency || AuditFrequency.QUARTERLY,
        costCenterCode: formData.costCenterCode || undefined,
      };
      await onSubmit(completeFormData);
      navigate(isEditMode && initialSoftware ? `/software/${initialSoftware.id}` : '/software');
    } catch (error) {
      console.error("Error submitting software form:", error);
      // TODO: Display error to user
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Card title="Basic Information" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Software Name" name="name" value={formData.name || ''} onChange={handleChange} error={errors.name} required />
          <VendorAutocomplete 
            label="Vendor" 
            value={formData.vendor || ''} 
            onChange={handleVendorChange} 
            error={errors.vendor} 
            required 
            existingVendors={existingVendors}
          />
        </div>
        <Textarea label="Description" name="description" value={formData.description || ''} onChange={handleChange} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <Select label="Primary Owner" name="ownerId" value={formData.ownerId || ''} onChange={handleChange} options={userOptions} error={errors.ownerId} placeholder="Select owner" required />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateSoftwareOwner}
                className="mb-1"
              >
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Departments Using It</label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
              {departmentOptions.map(opt => (
                <label key={opt.value} className="flex items-center">
                  <input type="checkbox" name="departmentIds" value={opt.value.toString()}
                    checked={formData.departmentIds?.includes(opt.value.toString())}
                    onChange={() => handleMultiSelectChange('departmentIds', opt.value.toString())}
                    className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                  />
                  <span className="ml-2 text-sm text-text-primary">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <CurrencyInput label="Total Cost (Inclusive of Taxes)" name="cost" value={formData.cost || 0} onChange={handleChange} error={errors.cost} required />
          <Select label="Payment Frequency" name="paymentFrequency" value={formData.paymentFrequency} onChange={handleChange} options={DEFAULT_PAYMENT_FREQUENCIES} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <CostCenterAutocomplete 
            label="Cost Center" 
            value={formData.costCenterCode || ''} 
            onChange={handleCostCenterChange} 
            costCenters={costCenters}
            error={errors.costCenterCode} 
            placeholder="Type cost center code or name..."
          />
          <Select label="Status" name="status" value={formData.status} onChange={handleChange} options={DEFAULT_SOFTWARE_STATUSES} />
        </div>
      </Card>

      <Card title="License Information" className="mb-6">
        <Select 
          label="License Type" 
          name="licenseType" 
          value={formData.licenseType || LicenseType.PER_USER_SEAT} 
          onChange={handleChange} 
          options={DEFAULT_LICENSE_TYPES} 
          error={errors.licenseType}
          required 
          className="mb-4" 
        />
        
        {formData.licenseType === LicenseType.PER_USER_SEAT && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6 border-l-2 border-brand-blue-light ml-1">
            <Input 
              label="Number of Seats Purchased" 
              name="seatsPurchased" 
              type="number" 
              value={formData.seatsPurchased === undefined ? '' : formData.seatsPurchased} 
              onChange={handleChange} 
              error={errors.seatsPurchased} 
              min="0" 
              required
            />
            <Input 
              label="Number of Seats Utilized" 
              name="seatsUtilized" 
              type="number" 
              value={formData.seatsUtilized === undefined ? '' : formData.seatsUtilized} 
              onChange={handleChange} 
              error={errors.seatsUtilized} 
              min="0" 
              required
            />
          </div>
        )}

        {formData.licenseType === LicenseType.USAGE_BASED && (
          <div className="pl-6 border-l-2 border-brand-blue-light ml-1 space-y-4">
            <Input 
              label="Usage Metric" 
              name="usageMetric" 
              value={formData.usageMetric || ''} 
              onChange={handleChange} 
              error={errors.usageMetric} 
              placeholder="e.g., API calls, Storage GB, Transactions" 
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Usage Limit" 
                name="usageLimit" 
                type="number" 
                value={formData.usageLimit === undefined ? '' : formData.usageLimit} 
                onChange={handleChange} 
                error={errors.usageLimit} 
                min="0" 
                placeholder="Maximum allowed usage"
              />
              <Input 
                label="Current Usage" 
                name="currentUsage" 
                type="number" 
                value={formData.currentUsage === undefined ? '' : formData.currentUsage} 
                onChange={handleChange} 
                error={errors.currentUsage} 
                min="0" 
                placeholder="Current usage amount"
              />
            </div>
          </div>
        )}

        {formData.licenseType === LicenseType.SITE_LICENSE && (
          <div className="pl-6 border-l-2 border-brand-blue-light ml-1">
            <Input 
              label="Number of Sites Licensed" 
              name="sitesLicensed" 
              type="number" 
              value={formData.sitesLicensed === undefined ? '' : formData.sitesLicensed} 
              onChange={handleChange} 
              error={errors.sitesLicensed} 
              min="1" 
              required
            />
          </div>
        )}

        {(formData.licenseType === LicenseType.PERPETUAL || 
          formData.licenseType === LicenseType.FREEMIUM || 
          formData.licenseType === LicenseType.OTHER) && (
          <div className="pl-6 border-l-2 border-brand-blue-light ml-1">
            <Textarea 
              label="License Notes" 
              name="licenseNotes" 
              value={formData.licenseNotes || ''} 
              onChange={handleChange} 
              placeholder="Additional details about the license terms, restrictions, or special conditions"
            />
          </div>
        )}
      </Card>

      <Card title="Contact & Support Information" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            label="Account Executive" 
            name="accountExecutive" 
            value={formData.accountExecutive || ''} 
            onChange={handleChange} 
            placeholder="Name of your account executive"
          />
          <Input 
            label="Account Executive Email" 
            name="accountExecutiveEmail" 
            type="email"
            value={formData.accountExecutiveEmail || ''} 
            onChange={handleChange} 
            placeholder="account.executive@vendor.com"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <Input 
            label="Support Website" 
            name="supportWebsite" 
            type="url"
            value={formData.supportWebsite || ''} 
            onChange={handleChange} 
            placeholder="https://support.vendor.com"
          />
          <Input 
            label="Support Email" 
            name="supportEmail" 
            type="email"
            value={formData.supportEmail || ''} 
            onChange={handleChange} 
            placeholder="support@vendor.com"
          />
        </div>
      </Card>

      <Card title="Audit Schedule" className="mb-6">
        <Select 
          label="Audit Frequency" 
          name="auditFrequency" 
          value={formData.auditFrequency || AuditFrequency.QUARTERLY} 
          onChange={handleChange} 
          options={DEFAULT_AUDIT_FREQUENCIES}
          required 
        />
        <div className="mt-3 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Automatic Scheduling:</strong> The system will automatically create and schedule audits based on your selected frequency. 
            Audits will be spaced out to avoid clustering on the same dates. You'll receive email reminders 3 days before each audit is due.
          </p>
        </div>
      </Card>

      <Card title="Categories & Features" className="mb-6">
        <TagInput
            availableTags={featureTags}
            selectedTagIds={formData.featureTagIds || []}
            onChange={handleTagChange}
            onNewTag={handleAddNewTag}
        />
      </Card>

      <Card title="Contract Information" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Contract Start Date" name="contractStartDate" type="date" value={formData.contractStartDate || ''} onChange={handleChange} error={errors.contractStartDate} required />
          <Input label="Renewal Date" name="renewalDate" type="date" value={formData.renewalDate || ''} onChange={handleChange} error={errors.renewalDate} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <Select label="Notice Period Required" name="noticePeriod" value={formData.noticePeriod} onChange={handleChange} options={DEFAULT_NOTICE_PERIODS} />
          <div className="flex items-center pt-6">
            <input id="autoRenewal" name="autoRenewal" type="checkbox" checked={formData.autoRenewal || false} onChange={handleChange} className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue" />
            <label htmlFor="autoRenewal" className="ml-2 block text-sm text-text-primary">Auto-Renew?</label>
            </div>
        </div>
      </Card>

      <Card title="Integration Tracking" className="mb-6">
        {formData.integrations?.map((integration, index) => (
            <div key={integration.id || index} className="mb-2 p-2 border rounded-md bg-gray-50">
                <p className="text-sm font-medium">{integration.externalIntegrationName || `Integration ${index + 1}`}</p>
                <p className="text-xs text-text-secondary">{integration.notes}</p>
                {integration.linkedSoftwareId && <p className="text-xs text-text-secondary">Links to: {initialSoftware?.name}</p>} {/* This might need to lookup software name if linkedSoftwareId is for other software */}
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteIntegration(integration.id as string)} className="text-red-500 mt-1">Remove</Button>
            </div>
        ))}
         <Input label="External Integration Name" value={newIntegration.externalIntegrationName || ''} onChange={(e) => setNewIntegration(p => ({...p, externalIntegrationName: e.target.value}))} placeholder="e.g., Slack, GitHub" />
         <Textarea label="Integration Notes" value={newIntegration.notes || ''} onChange={(e) => setNewIntegration(p => ({...p, notes: e.target.value}))} placeholder="Describe the integration" />
        <Button type="button" onClick={handleAddIntegration} leftIcon={<PlusIcon />} variant="outline" size="sm">Add Integration</Button>
      </Card>
      
      <Card title="Document Management" className="mb-6">
        {formData.documents?.map((doc, index) => (
            <div key={doc.id || index} className="mb-2 p-2 border rounded-md bg-gray-50 flex justify-between items-center">
                <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-text-secondary">Type: {doc.type} | Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id as string)} className="text-red-500"><TrashIcon /></Button>
            </div>
        ))}
        <FileUpload onFileUpload={handleDocumentUpload} label="Upload New Document" acceptedFileTypes=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" />
        {newDocument?.file && (
            <div className="mt-2">
                <Select label="Document Type"
                    options={DEFAULT_DOCUMENT_TYPES}
                    value={newDocument.type || DocumentType.OTHER}
                    onChange={(e) => setNewDocument(prev => prev ? {...prev, type: e.target.value as DocumentType} : null)}
                />
                <Button type="button" onClick={handleAddDocument} leftIcon={<PlusIcon />} variant="outline" size="sm" className="mt-2">Add Document</Button>
            </div>
        )}
      </Card>

      <div className="mt-8 flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
          {isEditMode ? 'Save Changes' : 'Add Software'}
        </Button>
      </div>

      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Create Software Owner"
      >
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="text-sm">
              Creating a new Software Owner user.
            </p>
            <p className="text-xs mt-1">
              Default password will be "firstacceptance". User will be required to change it on first login.
            </p>
          </div>

          <Input
            label="Full Name"
            value={userFormData.name}
            onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter full name"
            required
          />

          <Input
            label="Email"
            type="email"
            value={userFormData.email}
            onChange={handleUserEmailChange}
            onBlur={handleUserEmailBlur}
            placeholder="username (will auto-complete to @firstacceptance.com)"
            required
          />

          {userError && (
            <div className="text-red-600 text-sm">{userError}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowUserModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Software Owner
            </Button>
          </div>
        </form>
      </Modal>
    </form>
  );
};

export default SoftwareForm;
