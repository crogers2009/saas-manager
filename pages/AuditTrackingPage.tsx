
import React, { useEffect, useState, useCallback } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Select from '../components/Select';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import { Audit, Software, AuditChecklist, AuditFrequency, SelectOption } from '../types';
import { getAudits, getSoftwareList, addAudit as apiAddAudit, updateAudit as apiUpdateAudit } from '../services/apiService';
import AuditCompletionForm from '../components/AuditCompletionForm';
import { DEFAULT_AUDIT_FREQUENCIES, PlusIcon } from '../constants';
import { format } from 'date-fns';

const AuditTrackingPage: React.FC = () => {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [currentAudit, setCurrentAudit] = useState<Partial<Audit>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Audit, string>>>({});
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [auditToComplete, setAuditToComplete] = useState<Audit | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [auditList, sList] = await Promise.all([getAudits(), getSoftwareList()]);
      setAudits(auditList.sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()));
      setSoftwareList(sList);
    } catch (error) {
      console.error("Error fetching audit data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openNewAuditForm = () => {
    setIsEditMode(false);
    setCurrentAudit({
      softwareId: softwareList[0]?.id || '',
      scheduledDate: new Date().toISOString().split('T')[0],
      frequency: AuditFrequency.QUARTERLY,
      checklist: { verifyActiveUsers: false, checkSeatUtilization: false, reviewFeatureUsage: false, updateDepartmentAllocation: false },
    });
    setFormErrors({});
    setShowFormModal(true);
  };
  
  const openEditAuditForm = (audit: Audit) => {
    setIsEditMode(true);
    setCurrentAudit({
      ...audit,
      scheduledDate: new Date(audit.scheduledDate).toISOString().split('T')[0],
      completedDate: audit.completedDate ? new Date(audit.completedDate).toISOString().split('T')[0] : undefined,
    });
    setFormErrors({});
    setShowFormModal(true);
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentAudit(prev => ({ ...prev, [name]: value }));
  };

  const handleChecklistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setCurrentAudit(prev => ({
      ...prev,
      checklist: { ...(prev.checklist as AuditChecklist), [name]: checked },
    }));
  };
  
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof Audit, string>> = {};
    if (!currentAudit.softwareId) errors.softwareId = "Software is required.";
    if (!currentAudit.scheduledDate) errors.scheduledDate = "Scheduled date is required.";
    if (currentAudit.completedDate && currentAudit.scheduledDate && new Date(currentAudit.completedDate) < new Date(currentAudit.scheduledDate)) {
        errors.completedDate = "Completed date cannot be before scheduled date.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleSubmitAudit = async () => {
    if(!validateForm()) return;

    setIsSubmitting(true);
    const auditDataToSubmit = {
        ...currentAudit,
        scheduledDate: new Date(currentAudit.scheduledDate!).toISOString(), // ensure ISO string
        completedDate: currentAudit.completedDate ? new Date(currentAudit.completedDate).toISOString() : undefined,
    } as Audit;

    try {
      if (isEditMode && currentAudit.id) {
        const updatedAudit = await apiUpdateAudit(currentAudit.id, auditDataToSubmit);
        if (updatedAudit) {
          setAudits(prev => prev.map(a => (a.id === updatedAudit.id ? updatedAudit : a)));
        }
      } else {
        const newAudit = await apiAddAudit(auditDataToSubmit as Omit<Audit, 'id'>);
        setAudits(prev => [newAudit, ...prev]);
      }
      setShowFormModal(false);
      setCurrentAudit({});
    } catch (error) {
      console.error("Error submitting audit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCompletionForm = (audit: Audit) => {
    setAuditToComplete(audit);
    setShowCompletionForm(true);
  };

  const handleCompleteAudit = async (completedAudit: Audit, updatedSoftware?: Partial<Software>) => {
    try {
      const payload = updatedSoftware ? { ...completedAudit, updatedSoftware } : completedAudit;
      const updatedAudit = await apiUpdateAudit(completedAudit.id!, payload);
      if (updatedAudit) {
        setAudits(prev => prev.map(a => (a.id === updatedAudit.id ? updatedAudit : a)));
        // Refresh software list to get updated utilization data
        const updatedSoftwareList = await getSoftwareList();
        setSoftwareList(updatedSoftwareList);
      }
      setShowCompletionForm(false);
      setAuditToComplete(null);
    } catch (error) {
      console.error("Error completing audit:", error);
      throw error;
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const softwareOptions: SelectOption[] = softwareList.map(s => ({ value: s.id, label: s.name }));
  const getSoftwareName = (id: string) => softwareList.find(s => s.id === id)?.name || 'Unknown Software';

  // Filter audits by status
  const upcomingAudits = audits.filter(audit => !audit.completedDate && new Date(audit.scheduledDate) >= new Date());
  const overdueAudits = audits.filter(audit => !audit.completedDate && new Date(audit.scheduledDate) < new Date());
  const completedAudits = audits.filter(audit => audit.completedDate);

  return (
    <>
      <Header title="Audit Tracking" actions={
        <Button variant="primary" leftIcon={<PlusIcon />} onClick={openNewAuditForm}>
          Schedule New Audit
        </Button>
      }/>

      {audits.length === 0 ? (
        <EmptyState title="No audits scheduled" message="Schedule a new audit to track software usage and compliance." action={
            <Button variant="primary" leftIcon={<PlusIcon />} onClick={openNewAuditForm}>Schedule New Audit</Button>
        }/>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-red-50 border-red-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{overdueAudits.length}</div>
                <div className="text-sm text-red-600">Overdue Audits</div>
              </div>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{upcomingAudits.length}</div>
                <div className="text-sm text-yellow-600">Upcoming Audits</div>
              </div>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedAudits.length}</div>
                <div className="text-sm text-green-600">Completed Audits</div>
              </div>
            </Card>
          </div>

          {/* Overdue Audits */}
          {overdueAudits.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-red-600 mb-3">🚨 Overdue Audits</h2>
              <div className="space-y-3">
                {overdueAudits.map(audit => (
                  <Card key={audit.id} className="bg-red-50 border-red-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-brand-blue">{getSoftwareName(audit.softwareId)}</h3>
                        <p className="text-sm text-text-secondary">
                          Scheduled: {format(new Date(audit.scheduledDate), 'MMM d, yyyy')}
                        </p>
                        {audit.notes?.includes('Automatically scheduled') && (
                          <p className="text-xs text-blue-600 mt-1">
                            🤖 Automatically scheduled based on {audit.frequency.toLowerCase()} frequency
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge text="Overdue" color="red" dot />
                        <Badge 
                          text={`${Math.abs(Math.ceil((new Date(audit.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days late`}
                          color="red"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-text-primary"><strong>Frequency:</strong> {audit.frequency}</p>
                    {audit.notes && <p className="mt-1 text-sm text-text-secondary"><strong>Notes:</strong> {audit.notes}</p>}
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={() => openCompletionForm(audit)}>Complete Audit</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Audits */}
          {upcomingAudits.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-3">📅 Upcoming Audits</h2>
              <div className="space-y-3">
                {upcomingAudits.map(audit => (
                  <Card key={audit.id} className="hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-brand-blue">{getSoftwareName(audit.softwareId)}</h3>
                        <p className="text-sm text-text-secondary">
                          Scheduled: {format(new Date(audit.scheduledDate), 'MMM d, yyyy')}
                        </p>
                        {audit.notes?.includes('Automatically scheduled') && (
                          <p className="text-xs text-blue-600 mt-1">
                            🤖 Automatically scheduled based on {audit.frequency.toLowerCase()} frequency
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge text="Pending" color="yellow" dot />
                        <Badge 
                          text={`${Math.ceil((new Date(audit.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`}
                          color={
                            Math.ceil((new Date(audit.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3 
                              ? 'red' 
                              : Math.ceil((new Date(audit.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 7 
                              ? 'yellow' 
                              : 'blue'
                          }
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-text-primary"><strong>Frequency:</strong> {audit.frequency}</p>
                    {audit.notes && <p className="mt-1 text-sm text-text-secondary"><strong>Notes:</strong> {audit.notes}</p>}
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={() => openCompletionForm(audit)}>Complete Audit</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Audits */}
          {completedAudits.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-3">✅ Completed Audits</h2>
              <div className="space-y-3">
                {completedAudits.slice(0, 5).map(audit => (
                  <Card key={audit.id} className="bg-green-50 border-green-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-brand-blue">{getSoftwareName(audit.softwareId)}</h3>
                        <p className="text-sm text-text-secondary">
                          Scheduled: {format(new Date(audit.scheduledDate), 'MMM d, yyyy')} | 
                          Completed: {format(new Date(audit.completedDate!), 'MMM d, yyyy')}
                        </p>
                        {audit.notes?.includes('Automatically scheduled') && (
                          <p className="text-xs text-blue-600 mt-1">
                            🤖 Automatically scheduled based on {audit.frequency.toLowerCase()} frequency
                          </p>
                        )}
                      </div>
                      <Badge text="Completed" color="green" dot />
                    </div>
                    <p className="mt-2 text-sm text-text-primary"><strong>Frequency:</strong> {audit.frequency}</p>
                    {audit.notes && <p className="mt-1 text-sm text-text-secondary"><strong>Notes:</strong> {audit.notes}</p>}
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={() => openEditAuditForm(audit)}>View Details</Button>
                    </div>
                  </Card>
                ))}
                {completedAudits.length > 5 && (
                  <p className="text-sm text-text-secondary text-center">
                    And {completedAudits.length - 5} more completed audits...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={isEditMode ? "Edit Audit" : "Schedule New Audit"} size="lg">
        <form onSubmit={(e) => e.preventDefault()}>
          <Select label="Software" name="softwareId" options={softwareOptions} value={currentAudit.softwareId || ''} onChange={handleInputChange} error={formErrors.softwareId} required />
          <Input label="Scheduled Date" name="scheduledDate" type="date" value={currentAudit.scheduledDate || ''} onChange={handleInputChange} error={formErrors.scheduledDate} required />
          <Select label="Frequency" name="frequency" options={DEFAULT_AUDIT_FREQUENCIES} value={currentAudit.frequency || ''} onChange={handleInputChange} />
          
          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-text-secondary mb-1">Audit Checklist</legend>
            {(Object.keys(currentAudit.checklist || {}) as Array<keyof AuditChecklist>).map((key) => (
              <div key={key} className="flex items-center mb-1">
                <input
                  id={key}
                  name={key}
                  type="checkbox"
                  checked={currentAudit.checklist?.[key] || false}
                  onChange={handleChecklistChange}
                  className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                />
                <label htmlFor={key} className="ml-2 text-sm text-text-primary">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
              </div>
            ))}
          </fieldset>

          <Input label="Completed Date (optional)" name="completedDate" type="date" value={currentAudit.completedDate || ''} onChange={handleInputChange} error={formErrors.completedDate} />
          <Textarea label="Notes (optional)" name="notes" value={currentAudit.notes || ''} onChange={handleInputChange} />
          
          <div className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowFormModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitAudit} isLoading={isSubmitting} disabled={isSubmitting}>
              {isEditMode ? "Save Changes" : "Schedule Audit"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Audit Completion Form */}
      {showCompletionForm && auditToComplete && (
        <Modal isOpen={showCompletionForm} onClose={() => setShowCompletionForm(false)} title="" size="xl">
          <AuditCompletionForm 
            audit={auditToComplete}
            software={softwareList.find(s => s.id === auditToComplete.softwareId)!}
            onSubmit={handleCompleteAudit}
            onCancel={() => setShowCompletionForm(false)}
          />
        </Modal>
      )}
    </>
  );
};

export default AuditTrackingPage;

