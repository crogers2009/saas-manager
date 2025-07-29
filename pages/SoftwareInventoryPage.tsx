
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Button from '../components/Button';
import SoftwareListItem from '../components/SoftwareListItem';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Input from '../components/Input';
import Modal from '../components/Modal';
import { getSoftwareList, getUsers, getDepartments, getFeatureTags, deleteSoftware as apiDeleteSoftware } from '../services/apiService';
import { Software, User, Department, FeatureTag } from '../types';
import { PlusIcon } from '../constants';

const SoftwareInventoryPage: React.FC = () => {
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [featureTags, setFeatureTags] = useState<FeatureTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [softwareToDelete, setSoftwareToDelete] = useState<Software | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sList, uList, dList, fList] = await Promise.all([
        getSoftwareList(),
        getUsers(),
        getDepartments(),
        getFeatureTags(),
      ]);
      setSoftwareList(sList);
      setUsers(uList);
      setDepartments(dList);
      setFeatureTags(fList);
    } catch (error) {
      console.error("Error fetching software inventory data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteSoftware = async () => {
    if (!softwareToDelete) return;
    try {
      await apiDeleteSoftware(softwareToDelete.id);
      setSoftwareList(prevList => prevList.filter(s => s.id !== softwareToDelete.id));
      setShowDeleteModal(false);
      setSoftwareToDelete(null);
    } catch (error) {
      console.error("Error deleting software:", error);
      // Handle error display to user
    }
  };

  const openDeleteModal = (software: Software) => {
    setSoftwareToDelete(software);
    setShowDeleteModal(true);
  };

  const filteredSoftwareList = softwareList.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (users.find(u => u.id === s.ownerId)?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.featureTagIds.some(tagId => featureTags.find(ft => ft.id === tagId)?.name.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Header
        title="Software Inventory"
        actions={
          <Link to="/software/new">
            <Button variant="primary" leftIcon={<PlusIcon />}>
              Add New Software
            </Button>
          </Link>
        }
      />

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search software by name, vendor, owner, tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          containerClassName="max-w-lg"
        />
      </div>

      {filteredSoftwareList.length === 0 ? (
        <EmptyState
          title="No software found"
          message={searchTerm ? "Try adjusting your search term." : "Get started by adding new software."}
          action={!searchTerm && (
            <Link to="/software/new">
              <Button variant="primary" leftIcon={<PlusIcon />}>
                Add New Software
              </Button>
            </Link>
          )}
        />
      ) : (
        <div>
          {filteredSoftwareList.sort((a, b) => a.name.localeCompare(b.name)).map(software => (
            <SoftwareListItem
              key={software.id}
              software={software}
              departments={departments}
              owner={users.find(u => u.id === software.ownerId)}
              featureTags={featureTags}
              onDelete={() => openDeleteModal(software)}
            />
          ))}
        </div>
      )}

      {showDeleteModal && softwareToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title={`Delete ${softwareToDelete.name}?`}
        >
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete "{softwareToDelete.name}"? This action cannot be undone.
          </p>
          <div className="mt-4 space-x-2 text-right">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSoftware}>Delete</Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default SoftwareInventoryPage;
