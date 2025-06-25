
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { SoftwareRequest, RequestType, RequestStatus, User, SelectOption } from '../types';
import { getSoftwareRequests, addSoftwareRequest as apiAddSoftwareRequest, updateSoftwareRequest as apiUpdateSoftwareRequest, getUsers } from '../services/apiService';
import { DEFAULT_REQUEST_TYPES, DEFAULT_REQUEST_STATUSES, PlusIcon } from '../constants';
import { format } from 'date-fns';

const SoftwareRequestPage: React.FC = () => {
  const [requests, setRequests] = useState<SoftwareRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<Partial<SoftwareRequest>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SoftwareRequest, string>>>({});

  const MOCK_CURRENT_USER_ID = 'user-1'; // Admin or a Department Head

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reqs, userList] = await Promise.all([getSoftwareRequests(), getUsers()]);
      setRequests(reqs.sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching software requests:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openNewRequestForm = () => {
    setCurrentRequest({ 
        type: RequestType.SPECIFIC_SOFTWARE, 
        requesterId: MOCK_CURRENT_USER_ID 
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
     if (type === 'number') {
        setCurrentRequest(prev => ({ ...prev, [name]: parseFloat(value) || undefined }));
    } else {
        setCurrentRequest(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof SoftwareRequest, string>> = {};
    if (!currentRequest.type) errors.type = "Request type is required.";
    if (!currentRequest.businessJustification?.trim()) errors.businessJustification = "Business justification is required.";

    if (currentRequest.type === RequestType.SPECIFIC_SOFTWARE) {
        if (!currentRequest.softwareName?.trim()) errors.softwareName = "Software name is required.";
        if (currentRequest.estimatedCost === undefined || currentRequest.estimatedCost < 0) errors.estimatedCost = "Estimated cost must be a positive number.";
        if (currentRequest.numUsersNeeded === undefined || currentRequest.numUsersNeeded <= 0) errors.numUsersNeeded = "Number of users must be positive.";
    } else if (currentRequest.type === RequestType.GENERAL_NEED) {
        if (!currentRequest.problemToSolve?.trim()) errors.problemToSolve = "Problem to solve is required.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleSubmitRequest = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const requestData = {
        ...currentRequest,
        requesterId: MOCK_CURRENT_USER_ID, 
      } as Omit<SoftwareRequest, 'id' | 'requestDate' | 'status'>;
      
      const newRequest = await apiAddSoftwareRequest(requestData);
      setRequests(prev => [newRequest, ...prev]);
      setShowFormModal(false);
      setCurrentRequest({});
    } catch (error) {
      console.error("Error submitting software request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Placeholder for admin to update status
  const handleUpdateRequestStatus = async (requestId: string, newStatus: RequestStatus) => {
    try {
      const updatedRequest = await apiUpdateSoftwareRequest(requestId, { status: newStatus });
      if (updatedRequest) {
        setRequests(prevRequests => 
          prevRequests.map(req => req.id === requestId ? updatedRequest : req)
        );
      }
    } catch (error) {
      console.error("Error updating request status:", error);
    }
  };


  if (isLoading) return <LoadingSpinner />;

  const getRequestorName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown User';
  
  const requestStatusOptions: SelectOption[] = DEFAULT_REQUEST_STATUSES.map(s => ({value: s.value, label: s.label}));


  return (
    <>
      <Header title="Software Requests" actions={
        <Button variant="primary" leftIcon={<PlusIcon />} onClick={openNewRequestForm}>
          New Request
        </Button>
      }/>

      {requests.length === 0 ? (
        <EmptyState title="No software requests" message="Submit a new request to get started." action={
           <Button variant="primary" leftIcon={<PlusIcon />} onClick={openNewRequestForm}>
             New Request
           </Button>
        }/>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <Card key={req.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-brand-blue">
                    {req.type === RequestType.SPECIFIC_SOFTWARE ? req.softwareName : `General Need: ${req.problemToSolve?.substring(0, 50)}...`}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Requested by: {getRequestorName(req.requesterId)} on {format(new Date(req.requestDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <Badge 
                    text={req.status} 
                    color={req.status === RequestStatus.PENDING ? 'yellow' : req.status === RequestStatus.APPROVED ? 'green' : 'red'} 
                    dot 
                />
              </div>
              <p className="mt-2 text-sm text-text-primary"><strong>Justification:</strong> {req.businessJustification}</p>
              {req.type === RequestType.SPECIFIC_SOFTWARE && (
                <div className="mt-2 text-xs text-text-secondary grid grid-cols-2 gap-2">
                  <p><strong>Vendor:</strong> {req.vendorName || 'N/A'}</p>
                  <p><strong>Est. Cost:</strong> ${req.estimatedCost?.toLocaleString() || 'N/A'}</p>
                  <p><strong>Users Needed:</strong> {req.numUsersNeeded || 'N/A'}</p>
                </div>
              )}
              {req.type === RequestType.GENERAL_NEED && (
                 <div className="mt-2 text-xs text-text-secondary grid grid-cols-2 gap-2">
                  <p><strong>Pain Points:</strong> {req.currentPainPoints || 'N/A'}</p>
                  <p><strong>Requirements:</strong> {req.featureRequirements || 'N/A'}</p>
                  <p><strong>Budget:</strong> {req.budgetRange || 'N/A'}</p>
                  <p><strong>Timeline:</strong> {req.timeline || 'N/A'}</p>
                 </div>
              )}
              {/* Admin: Update status controls */}
              {MOCK_CURRENT_USER_ID === 'user-1' && req.status === RequestStatus.PENDING && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center space-x-2">
                    <span className="text-sm font-medium text-text-secondary">Update Status:</span>
                    <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleUpdateRequestStatus(req.id, RequestStatus.APPROVED)}>Approve</Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleUpdateRequestStatus(req.id, RequestStatus.REJECTED)}>Reject</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title="Submit Software Request" size="lg">
        <form onSubmit={(e) => e.preventDefault()}>
          <Select label="Request Type" name="type" options={DEFAULT_REQUEST_TYPES} value={currentRequest.type} onChange={handleInputChange} error={formErrors.type} />
          
          {currentRequest.type === RequestType.SPECIFIC_SOFTWARE && (
            <>
              <Input label="Software Name" name="softwareName" value={currentRequest.softwareName || ''} onChange={handleInputChange} error={formErrors.softwareName} />
              <Input label="Vendor (if known)" name="vendorName" value={currentRequest.vendorName || ''} onChange={handleInputChange} />
              <Input label="Estimated Cost ($)" name="estimatedCost" type="number" value={currentRequest.estimatedCost || ''} onChange={handleInputChange} error={formErrors.estimatedCost} />
              <Input label="Number of Users Needed" name="numUsersNeeded" type="number" value={currentRequest.numUsersNeeded || ''} onChange={handleInputChange} error={formErrors.numUsersNeeded} />
            </>
          )}

          {currentRequest.type === RequestType.GENERAL_NEED && (
            <>
              <Textarea label="Problem Trying to Solve" name="problemToSolve" value={currentRequest.problemToSolve || ''} onChange={handleInputChange} error={formErrors.problemToSolve} />
              <Textarea label="Current Pain Points" name="currentPainPoints" value={currentRequest.currentPainPoints || ''} onChange={handleInputChange} />
              <Textarea label="Feature Requirements" name="featureRequirements" value={currentRequest.featureRequirements || ''} onChange={handleInputChange} />
              <Input label="Budget Range" name="budgetRange" value={currentRequest.budgetRange || ''} onChange={handleInputChange} />
              <Input label="Timeline" name="timeline" value={currentRequest.timeline || ''} onChange={handleInputChange} />
            </>
          )}

          <Textarea label="Business Justification" name="businessJustification" value={currentRequest.businessJustification || ''} onChange={handleInputChange} error={formErrors.businessJustification} required />
          
          <div className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowFormModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitRequest} isLoading={isSubmitting} disabled={isSubmitting}>Submit Request</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default SoftwareRequestPage;
