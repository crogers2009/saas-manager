
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { getSoftwareById, getUsers, getDepartments, getFeatureTags, getAuditsForSoftware, deleteSoftware as apiDeleteSoftware, uploadDocumentToSoftware, deleteDocumentFromSoftware, addIntegrationToSoftware, deleteIntegrationFromSoftware, getSoftwareList } from '../services/apiService';
import { Software, User, Department, FeatureTag, Audit, DocumentFile, DocumentType, Integration, SoftwareStatus, PaymentFrequency, NoticePeriod, SelectOption, LicenseType } from '../types';
import { format, differenceInDays } from 'date-fns';
import { EditIcon, TrashIcon, PlusIcon, ExternalLinkIcon, UploadIcon } from '../constants'; // Make sure icons are in constants
import FileUpload from '../components/FileUpload';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import { DEFAULT_DOCUMENT_TYPES } from '../constants';

const SoftwareDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [software, setSoftware] = useState<Software | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [featureTags, setFeatureTags] = useState<FeatureTag[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]); // Added audits state
  const [allSoftwareList, setAllSoftwareList] = useState<Software[]>([]); // For linked software name
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [newDocument, setNewDocument] = useState<{ name: string, type: DocumentType, file?: File } | null>(null);
  
  const [showAddIntegrationModal, setShowAddIntegrationModal] = useState(false);
  const [newIntegration, setNewIntegration] = useState<Partial<Integration>>({ externalIntegrationName: '', notes: '' });


  const fetchSoftwareData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [sw, usersList, deptsList, tagsList, softwareAudits, allSwList] = await Promise.all([
        getSoftwareById(id),
        getUsers(),
        getDepartments(),
        getFeatureTags(),
        getAuditsForSoftware(id),
        getSoftwareList(), // Fetch all software for integration linking
      ]);

      if (sw) {
        setSoftware(sw);
        setOwner(usersList.find(u => u.id === sw.ownerId) || null);
        setAllDepartments(deptsList);
        setDepartments(deptsList.filter(d => sw.departmentIds.includes(d.id)));
        setFeatureTags(tagsList.filter(t => sw.featureTagIds.includes(t.id)));
        setAudits(softwareAudits);
        setAllSoftwareList(allSwList);
      } else {
        // Handle software not found
        setSoftware(null);
      }
    } catch (error) {
      console.error("Error fetching software details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSoftwareData();
  }, [fetchSoftwareData]);

  const handleDeleteSoftware = async () => {
    if (!software) return;
    try {
      await apiDeleteSoftware(software.id);
      setShowDeleteModal(false);
      navigate('/software');
    } catch (error) {
      console.error("Error deleting software:", error);
    }
  };
  
  const handleDocumentUpload = (file: File) => {
    setNewDocument(prev => ({ name: file.name, type: prev?.type || DocumentType.OTHER, file }));
  };

  const handleAddDocument = async () => {
    if (software && newDocument && newDocument.file) {
      try {
        const updatedSoftware = await uploadDocumentToSoftware(
          software.id,
          newDocument.file,
          newDocument.name,
          newDocument.type,
          software.name
        );
        if (updatedSoftware) setSoftware(updatedSoftware);
        setNewDocument(null);
        setShowAddDocumentModal(false);
      } catch (error) {
        console.error('Error uploading document:', error);
        // You could add a toast notification here
      }
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (software) {
        const updatedSoftware = await deleteDocumentFromSoftware(software.id, docId);
        if (updatedSoftware) setSoftware(updatedSoftware);
    }
  };

  const handleAddIntegration = async () => {
    if (software && (newIntegration.externalIntegrationName || newIntegration.notes || newIntegration.linkedSoftwareId)) {
        const updatedSoftware = await addIntegrationToSoftware(software.id, {
            externalIntegrationName: newIntegration.externalIntegrationName,
            linkedSoftwareId: newIntegration.linkedSoftwareId,
            notes: newIntegration.notes || '',
        });
        if (updatedSoftware) setSoftware(updatedSoftware);
        setNewIntegration({ externalIntegrationName: '', notes: '', linkedSoftwareId: '' });
        setShowAddIntegrationModal(false);
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
      if (software) {
          const updatedSoftware = await deleteIntegrationFromSoftware(software.id, integrationId);
          if (updatedSoftware) setSoftware(updatedSoftware);
      }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!software) {
    return (
      <>
        <Header title="Software Not Found" />
        <EmptyState title="Software not found" message="The software you are looking for does not exist or has been removed." />
      </>
    );
  }
  
  const getStatusColor = (status: SoftwareStatus): 'green' | 'yellow' | 'gray' => {
    switch (status) {
      case SoftwareStatus.ACTIVE: return 'green';
      case SoftwareStatus.PENDING_APPROVAL: return 'yellow';
      case SoftwareStatus.INACTIVE: return 'gray';
      default: return 'gray';
    }
  };

  const DetailItem: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
    <div className={`py-2 ${className}`}>
      <dt className="text-sm font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 text-sm text-text-primary">{value || 'N/A'}</dd>
    </div>
  );
  
  const costPerSeat = software.licenseType === LicenseType.PER_USER_SEAT && software.seatsPurchased && software.seatsPurchased > 0
    ? (software.cost / software.seatsPurchased).toFixed(2)
    : null;

  const softwareOptionsForIntegration: SelectOption[] = allSoftwareList
    .filter(s => s.id !== software.id) // Exclude current software
    .map(s => ({ value: s.id, label: s.name }));

  return (
    <>
      <Header
        title={software.name}
        actions={
          isAdmin ? (
            <div className="space-x-2">
              <Link to={`/software/${software.id}/edit`}>
                <Button variant="outline" leftIcon={<EditIcon />}>Edit</Button>
              </Link>
              <Button variant="danger" leftIcon={<TrashIcon />} onClick={() => setShowDeleteModal(true)}>Delete</Button>
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Basic Information">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem label="Vendor" value={software.vendor} />
              <DetailItem label="Status" value={<Badge text={software.status} color={getStatusColor(software.status)} dot />} />
              <DetailItem label="Primary Owner" value={owner?.name} />
              <DetailItem label="Total Cost" value={`$${software.cost.toLocaleString()} / ${software.paymentFrequency}`} />
              <DetailItem label="License Type" value={software.licenseType} />
              {software.licenseType === LicenseType.PER_USER_SEAT && (
                <>
                  <DetailItem label="Seats Purchased" value={software.seatsPurchased?.toLocaleString()} />
                  <DetailItem label="Seats Utilized" value={software.seatsUtilized?.toLocaleString()} />
                  {costPerSeat !== null && <DetailItem label="Cost Per Seat" value={`$${costPerSeat} / ${software.paymentFrequency}`} />}
                </>
              )}
              {software.licenseType === LicenseType.USAGE_BASED && (
                <>
                  <DetailItem label="Usage Metric" value={software.usageMetric} />
                  <DetailItem label="Usage Limit" value={software.usageLimit?.toLocaleString()} />
                  <DetailItem label="Current Usage" value={software.currentUsage?.toLocaleString()} />
                </>
              )}
              {software.licenseType === LicenseType.SITE_LICENSE && (
                <DetailItem label="Sites Licensed" value={software.sitesLicensed?.toLocaleString()} />
              )}
              {(software.licenseType === LicenseType.PERPETUAL || 
                software.licenseType === LicenseType.FREEMIUM || 
                software.licenseType === LicenseType.OTHER) && 
                software.licenseNotes && (
                <DetailItem label="License Notes" value={software.licenseNotes} className="md:col-span-2" />
              )}
              <DetailItem label="Description" value={software.description} className="md:col-span-2" />
            </dl>
          </Card>

          <Card title="Contact & Support Information">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem 
                label="Account Executive" 
                value={software.accountExecutive} 
              />
              <DetailItem 
                label="Account Executive Email" 
                value={software.accountExecutiveEmail ? (
                  <a href={`mailto:${software.accountExecutiveEmail}`} className="text-brand-blue hover:underline">
                    {software.accountExecutiveEmail}
                  </a>
                ) : null} 
              />
              <DetailItem 
                label="Support Website" 
                value={software.supportWebsite ? (
                  <a href={software.supportWebsite} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                    {software.supportWebsite} <ExternalLinkIcon />
                  </a>
                ) : null} 
              />
              <DetailItem 
                label="Support Email" 
                value={software.supportEmail ? (
                  <a href={`mailto:${software.supportEmail}`} className="text-brand-blue hover:underline">
                    {software.supportEmail}
                  </a>
                ) : null} 
              />
            </dl>
          </Card>

          <Card title="Renewal & Contract">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem label="Renewal Date" value={`${format(new Date(software.renewalDate), 'MMMM d, yyyy')} (${differenceInDays(new Date(software.renewalDate), new Date())} days)`} />
              <DetailItem label="Notice Period" value={software.noticePeriod} />
              <DetailItem label="Contract Start Date" value={format(new Date(software.contractStartDate), 'MMMM d, yyyy')} />
              <DetailItem label="Auto-Renew" value={software.autoRenewal ? 'Yes' : 'No'} />
            </dl>
          </Card>

          <Card title="Documents" actions={
            isAdmin ? (
              <Button variant="outline" size="sm" leftIcon={<PlusIcon />} onClick={() => setShowAddDocumentModal(true)}>Add Document</Button>
            ) : null
          }>
            {software.documents.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {software.documents.map(doc => (
                  <li key={doc.id} className="py-3 flex justify-between items-center">
                    <div>
                      <a href={doc.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-blue hover:underline cursor-pointer">{doc.name} <ExternalLinkIcon/></a>
                      <p className="text-xs text-text-secondary">{doc.type} - Uploaded: {format(new Date(doc.uploadDate), 'MMM d, yyyy')}</p>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} className="text-red-500"><TrashIcon /></Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-text-secondary">No documents uploaded.</p>}
          </Card>
        </div>

        {/* Right Column - Sidebar Details */}
        <div className="space-y-6">
          <Card title="Departments">
            {departments.length > 0 ? (
              departments.map(dept => <Badge key={dept.id} text={dept.name} color="gray" className="mr-1 mb-1" />)
            ) : <p className="text-sm text-text-secondary">No departments assigned.</p>}
          </Card>

          <Card title="Feature Tags">
            {featureTags.length > 0 ? (
              featureTags.map(tag => <Badge key={tag.id} text={tag.name} color="indigo" className="mr-1 mb-1" />)
            ) : <p className="text-sm text-text-secondary">No feature tags assigned.</p>}
          </Card>
          
          <Card title="Integrations" actions={
             isAdmin ? (
               <Button variant="outline" size="sm" leftIcon={<PlusIcon />} onClick={() => setShowAddIntegrationModal(true)}>Add Integration</Button>
             ) : null
          }>
            {software.integrations.length > 0 ? (
                <ul className="space-y-2">
                    {software.integrations.map(integration => (
                        <li key={integration.id} className="p-2 border rounded-md bg-gray-50 text-sm">
                            <div className="flex justify-between items-start">
                                <p className="font-medium">{integration.externalIntegrationName || 'Internal Link'}</p>
                                {isAdmin && (
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteIntegration(integration.id)} className="text-red-500 -mt-1 -mr-1"><TrashIcon /></Button>
                                )}
                            </div>
                            {integration.linkedSoftwareId && <p className="text-xs text-text-secondary">Links to: {allSoftwareList.find(s => s.id === integration.linkedSoftwareId)?.name || 'Another Software'}</p>}
                            <p className="text-xs text-text-secondary mt-1">{integration.notes}</p>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-text-secondary">No integrations tracked.</p>}
          </Card>

          <Card title="Audit History">
             {audits.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                    {audits.map(audit => (
                        <li key={audit.id} className="py-2">
                            <p className="text-sm font-medium">Scheduled: {format(new Date(audit.scheduledDate), 'MMM d, yyyy')}</p>
                            {audit.completedDate && <p className="text-xs text-green-600">Completed: {format(new Date(audit.completedDate), 'MMM d, yyyy')}</p>}
                            <p className="text-xs text-text-secondary">{audit.notes || 'No notes.'}</p>
                        </li>
                    ))}
                </ul>
             ) : <p className="text-sm text-text-secondary">No audit history.</p>}
             <Link to="/audits" className="text-sm text-brand-blue hover:underline mt-2 block">View All Audits</Link>
          </Card>
        </div>
      </div>
      
      {/* Modals */}
      {showDeleteModal && (
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={`Delete ${software.name}?`}>
          <p className="text-sm text-text-secondary">Are you sure you want to delete "{software.name}"? This action cannot be undone.</p>
          <div className="mt-4 space-x-2 text-right">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSoftware}>Delete</Button>
          </div>
        </Modal>
      )}

      <Modal isOpen={showAddDocumentModal} onClose={() => {setShowAddDocumentModal(false); setNewDocument(null);}} title="Add New Document">
            <FileUpload onFileUpload={handleDocumentUpload} label="Select Document" />
            {newDocument?.file && (
                <div className="mt-2">
                    <Select label="Document Type"
                        options={DEFAULT_DOCUMENT_TYPES}
                        value={newDocument.type || DocumentType.OTHER}
                        onChange={(e) => setNewDocument(prev => prev ? {...prev, type: e.target.value as DocumentType} : null)}
                    />
                    <div className="mt-4 space-x-2 text-right">
                        <Button variant="outline" onClick={() => {setShowAddDocumentModal(false); setNewDocument(null);}}>Cancel</Button>
                        <Button variant="primary" onClick={handleAddDocument}>Add Document</Button>
                    </div>
                </div>
            )}
      </Modal>
      
      <Modal isOpen={showAddIntegrationModal} onClose={() => {setShowAddIntegrationModal(false); setNewIntegration({});}} title="Add New Integration" size="md">
         <Input label="External System Name (Optional)" value={newIntegration.externalIntegrationName || ''} onChange={(e) => setNewIntegration(p => ({...p, externalIntegrationName: e.target.value}))} placeholder="e.g., Slack, GitHub" />
         <Select
            label="Link to Internal Software (Optional)"
            name="linkedSoftwareId"
            options={softwareOptionsForIntegration}
            value={newIntegration.linkedSoftwareId || ''}
            onChange={(e) => setNewIntegration(p => ({...p, linkedSoftwareId: e.target.value}))}
            placeholder="Select software..."
         />
         <Textarea label="Integration Notes" value={newIntegration.notes || ''} onChange={(e) => setNewIntegration(p => ({...p, notes: e.target.value}))} placeholder="Describe the integration" />
         <div className="mt-4 space-x-2 text-right">
            <Button variant="outline" onClick={() => {setShowAddIntegrationModal(false); setNewIntegration({});}}>Cancel</Button>
            <Button variant="primary" onClick={handleAddIntegration}>Add Integration</Button>
        </div>
      </Modal>

    </>
  );
};

export default SoftwareDetailPage;
