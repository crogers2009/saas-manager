
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SoftwareForm from '../components/SoftwareForm';
import LoadingSpinner from '../components/LoadingSpinner';
import { Software } from '../types';
import { getSoftwareById, addSoftware as apiAddSoftware, updateSoftware as apiUpdateSoftware } from '../services/apiService';

const AddEditSoftwarePage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [initialSoftware, setInitialSoftware] = useState<Software | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = Boolean(id);

  const fetchSoftware = useCallback(async () => {
    if (id) {
      setIsLoading(true);
      try {
        const softwareData = await getSoftwareById(id);
        if (softwareData) {
          setInitialSoftware(softwareData);
        } else {
          navigate('/software'); // Software not found, redirect
        }
      } catch (error) {
        console.error("Error fetching software for edit:", error);
        navigate('/software');
      } finally {
        setIsLoading(false);
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isEditMode) {
      fetchSoftware();
    }
  }, [isEditMode, fetchSoftware]);

  const handleSubmit = async (softwareData: Software) => {
    setIsLoading(true);
    try {
      if (isEditMode && id) {
        await apiUpdateSoftware(id, softwareData);
      } else {
        await apiAddSoftware(softwareData);
      }
      // Navigate after successful submission is handled by SoftwareForm
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} software:`, error);
      // Optionally: set an error state to display to the user
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isEditMode) {
    return <LoadingSpinner />;
  }
  
  // For new software, initialSoftware will be undefined, which SoftwareForm handles for defaults
  // For edit mode, if initialSoftware is still undefined after loading, it means it's still loading or error occurred.
  if (isEditMode && !initialSoftware && isLoading) {
     return <LoadingSpinner />;
  }
   if (isEditMode && !initialSoftware && !isLoading) {
     // This case means software was not found or error during fetch, already handled by redirect in fetchSoftware
     return <p>Error loading software data. You may be redirected.</p>;
  }


  return (
    <>
      <Header title={isEditMode ? `Edit ${initialSoftware?.name || 'Software'}` : 'Add New Software'} />
      <SoftwareForm
        initialSoftware={initialSoftware}
        onSubmit={handleSubmit}
        isEditMode={isEditMode}
      />
    </>
  );
};

export default AddEditSoftwarePage;
