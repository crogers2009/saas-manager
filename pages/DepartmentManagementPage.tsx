import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Card from '../components/Card';
import { PlusIcon, EditIcon, TrashIcon } from '../constants';
import { Department } from '../types';
import { getDepartments, addDepartment, updateDepartment, deleteDepartment } from '../services/apiService';

const DepartmentManagementPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingDepartment(null);
    setFormData({ name: '' });
    setShowModal(true);
  };

  const handleEditClick = (department: Department) => {
    setEditingDepartment(department);
    setFormData({ name: department.name });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Department name is required');
      return;
    }

    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, formData);
      } else {
        await addDepartment(formData);
      }
      await loadDepartments();
      setShowModal(false);
      setFormData({ name: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleDelete = async (department: Department) => {
    if (window.confirm(`Are you sure you want to delete the "${department.name}" department?`)) {
      try {
        await deleteDepartment(department.id);
        await loadDepartments();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete department');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
          <p className="text-gray-600">Manage your organization's departments</p>
        </div>
        <Button onClick={handleAddClick} className="flex items-center">
          <PlusIcon />
          <span className="ml-2">Add Department</span>
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => (
          <Card key={department.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{department.name}</h3>
                <p className="text-sm text-gray-500 mt-1">ID: {department.id}</p>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleEditClick(department)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Edit department"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => handleDelete(department)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Delete department"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {departments.length === 0 && (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No departments found</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first department.</p>
          <Button onClick={handleAddClick}>
            Add Department
          </Button>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Department Name"
            value={formData.name}
            onChange={(e) => setFormData({ name: e.target.value })}
            placeholder="Enter department name"
            required
          />

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingDepartment ? 'Update' : 'Add'} Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentManagementPage;