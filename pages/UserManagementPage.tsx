import React, { useState, useEffect } from 'react';
import { User, UserRole, Department } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { getUsers, getDepartments, apiRequest } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

const UserManagementPage: React.FC = () => {
  const { user } = useAuth(); // Replaced isAdmin with user
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.SOFTWARE_OWNER,
    password: 'firstacceptance',
    departmentIds: [],
    isActive: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const departmentsData = await getDepartments();
      setDepartments(departmentsData);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingUser ? `/users/${editingUser.id}` : '/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      await apiRequest(url, {
        method,
        body: JSON.stringify(formData),
      });

      await fetchUsers();
      handleCloseModal();
    } catch (error: any) {
      setError(error.message || 'Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      departmentIds: user.departmentIds || [],
      isActive: user.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await apiRequest(`/users/${userId}`, { method: 'DELETE' });
      await fetchUsers();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Are you sure you want to reset this user\'s password to the default? They will be required to change it on next login.')) return;

    try {
      await apiRequest(`/users/${userId}/reset-password`, { method: 'POST' });
      await fetchUsers();
      alert('Password reset successfully. User will be prompted to change password on next login.');
    } catch (error) {
      alert('Failed to reset password');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let email = e.target.value;
    
    // Auto-append domain if user types just a username
    if (email && !email.includes('@') && e.nativeEvent instanceof KeyboardEvent && 
        (e.nativeEvent.key === 'Tab' || e.nativeEvent.key === 'Enter')) {
      email = email + '@firstacceptance.com';
    }
    
    setFormData({ ...formData, email });
  };

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let email = e.target.value;
    
    // Auto-append domain on blur if user typed just a username
    if (email && !email.includes('@')) {
      email = email + '@firstacceptance.com';
      setFormData({ ...formData, email });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: UserRole.SOFTWARE_OWNER,
      password: 'firstacceptance',
      departmentIds: [],
      isActive: true,
    });
    setError('');
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: UserRole.SOFTWARE_OWNER,
      password: 'firstacceptance',
      departmentIds: [],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage users, roles, and permissions for the SaaS Manager application.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button onClick={handleNewUser}>
            Add New User
          </Button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.sort((a, b) => a.name.localeCompare(b.name)).map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      {!user.isActive && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {user.role}
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(user.id)}
                    >
                      Reset Password
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Input
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            placeholder="username (will auto-complete to @firstacceptance.com)"
            required
          />

          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            options={[
              { value: UserRole.ADMIN, label: 'Administrator' },
              { value: UserRole.SOFTWARE_OWNER, label: 'Software Owner' },
              { value: UserRole.DEPARTMENT_HEAD, label: 'Department Head' },
            ]}
          />

          {formData.role === UserRole.DEPARTMENT_HEAD && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Departments</label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
                {departments.map(dept => (
                  <label key={dept.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.departmentIds.includes(dept.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ 
                            ...prev, 
                            departmentIds: [...prev.departmentIds, dept.id] 
                          }));
                        } else {
                          setFormData(prev => ({ 
                            ...prev, 
                            departmentIds: prev.departmentIds.filter(id => id !== dept.id) 
                          }));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">{dept.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Input
            label={editingUser ? "New Password (leave blank to keep current)" : "Default Password"}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editingUser}
            placeholder={!editingUser ? "Default: firstacceptance (user will be required to change)" : ""}
            readOnly={!editingUser}
          />

          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active User
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;