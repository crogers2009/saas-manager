import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import { getCostCenters, createCostCenter, updateCostCenter, deleteCostCenter } from '../services/apiService';
import { CostCenter } from '../types';
import { PlusIcon, EditIcon, TrashIcon } from '../constants';

const CostCenterManagementPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [costCenterToDelete, setCostCenterToDelete] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    isActive: true
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const data = await getCostCenters();
      setCostCenters(data.sort((a, b) => a.code.localeCompare(b.code)));
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCostCenter(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      isActive: true
    });
    setFormError('');
    setShowModal(true);
  };

  const handleEdit = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter);
    setFormData({
      code: costCenter.code,
      name: costCenter.name,
      description: costCenter.description || '',
      isActive: costCenter.isActive
    });
    setFormError('');
    setShowModal(true);
  };

  const handleDelete = (costCenter: CostCenter) => {
    setCostCenterToDelete(costCenter);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    if (!formData.code.trim() || !formData.name.trim()) {
      setFormError('Code and name are required');
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingCostCenter) {
        const updated = await updateCostCenter(editingCostCenter.id, formData);
        setCostCenters(prev => 
          prev.map(cc => cc.id === updated.id ? updated : cc)
            .sort((a, b) => a.code.localeCompare(b.code))
        );
      } else {
        const created = await createCostCenter(formData);
        setCostCenters(prev => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)));
      }
      
      setShowModal(false);
      setFormData({ code: '', name: '', description: '', isActive: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save cost center');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!costCenterToDelete) return;

    try {
      await deleteCostCenter(costCenterToDelete.id);
      setCostCenters(prev => prev.filter(cc => cc.id !== costCenterToDelete.id));
      setShowDeleteModal(false);
      setCostCenterToDelete(null);
    } catch (error) {
      console.error('Error deleting cost center:', error);
      // You could add a toast notification here
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  if (!isAdmin) {
    return (
      <>
        <Header title="Access Denied" />
        <EmptyState title="Access Denied" message="You must be an administrator to access cost center management." />
      </>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Header
        title="Cost Center Management"
        actions={
          <Button variant="primary" leftIcon={<PlusIcon />} onClick={handleCreate}>
            Add Cost Center
          </Button>
        }
      />

      <div className="space-y-6">
        <Card title="Cost Centers" className="overflow-hidden">
          {costCenters.length === 0 ? (
            <EmptyState
              title="No cost centers"
              message="Create your first cost center to start organizing software expenses."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costCenters.map((costCenter) => (
                    <tr key={costCenter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {costCenter.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {costCenter.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {costCenter.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          text={costCenter.isActive ? 'Active' : 'Inactive'} 
                          color={costCenter.isActive ? 'green' : 'gray'} 
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<EditIcon />}
                          onClick={() => handleEdit(costCenter)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<TrashIcon />}
                          onClick={() => handleDelete(costCenter)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCostCenter ? 'Edit Cost Center' : 'Create Cost Center'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {formError}
            </div>
          )}

          <Input
            label="Code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="e.g., ENG001, MKT001"
            required
            className="uppercase"
          />

          <Input
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Engineering Department"
            required
          />

          <Textarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Optional description of the cost center"
            rows={3}
          />

          <div className="flex items-center">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-text-primary">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editingCostCenter ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Cost Center"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete the cost center "{costCenterToDelete?.name}" ({costCenterToDelete?.code})?
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone. The cost center cannot be deleted if it's currently used by any software.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

    </>
  );
};

export default CostCenterManagementPage;