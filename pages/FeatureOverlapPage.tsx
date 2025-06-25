import React, { useEffect, useState, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import { getSoftwareList, getFeatureTags, getDepartments } from '../services/apiService';
import { Software, FeatureTag, Department, SoftwareStatus } from '../types';
import { Link } from 'react-router-dom';

interface OverlapGroup {
  tag: FeatureTag;
  software: Software[];
}

const FeatureOverlapPage: React.FC = () => {
  const [allSoftware, setAllSoftware] = useState<Software[]>([]);
  const [allFeatureTags, setAllFeatureTags] = useState<FeatureTag[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [sList, fList, dList] = await Promise.all([
          getSoftwareList(),
          getFeatureTags(),
          getDepartments(),
        ]);
        setAllSoftware(sList.filter(s => s.status === SoftwareStatus.ACTIVE)); // Only active software for overlap
        setAllFeatureTags(fList);
        setAllDepartments(dList);
      } catch (error) {
        console.error("Error fetching feature overlap data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const overlapGroups: OverlapGroup[] = useMemo(() => {
    const groups: Record<string, { tag: FeatureTag; software: Software[] }> = {};
    
    allSoftware.forEach(software => {
      software.featureTagIds.forEach(tagId => {
        const tag = allFeatureTags.find(t => t.id === tagId);
        if (tag) {
          if (!groups[tagId]) {
            groups[tagId] = { tag, software: [] };
          }
          groups[tagId].software.push(software);
        }
      });
    });
    
    // Filter for groups with more than one software (actual overlap) and sort by number of software
    return Object.values(groups)
      .filter(group => group.software.length > 1)
      .sort((a,b) => b.software.length - a.software.length);

  }, [allSoftware, allFeatureTags]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <Header title="Feature Overlap Report" />

      {overlapGroups.length === 0 ? (
        <EmptyState title="No feature overlaps found" message="Ensure software has feature tags assigned. Overlaps are shown when multiple tools share the same tag." />
      ) : (
        <div className="space-y-6">
          {overlapGroups.map(group => (
            <Card key={group.tag.id} title={`Feature: ${group.tag.name}`} className="border-l-4 border-yellow-400">
              <p className="mb-3 text-sm text-text-secondary">{group.software.length} tools share this feature.</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Software</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Vendor</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cost</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Departments</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.software.map(software => {
                       const softwareDepartments = software.departmentIds
                        .map(id => allDepartments.find(d => d.id === id)?.name)
                        .filter(Boolean);
                      return (
                        <tr key={software.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-brand-blue">
                            <Link to={`/software/${software.id}`} className="hover:underline">{software.name}</Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{software.vendor}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">${software.cost.toLocaleString()} / {software.paymentFrequency}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                            {softwareDepartments.length > 0 ? softwareDepartments.map(deptName => (
                                <Badge key={deptName} text={deptName} color="gray" size="sm" className="mr-1 mb-1"/>
                            )) : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default FeatureOverlapPage;