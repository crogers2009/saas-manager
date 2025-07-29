
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import Select from '../components/Select';
import { getSoftwareList, getUsers, getDepartments } from '../services/apiService';
import { Software, User, Department, NoticePeriod, SelectOption, SoftwareStatus } from '../types';
import { addMonths, startOfMonth, endOfMonth, differenceInDays, format } from 'date-fns';
import { formatDateSafely, getDaysDifference, safeParseDateString } from '../utils/dateUtils';

interface RenewalFilter {
  month: string; // "all" or "YYYY-MM"
  departmentId: string; // "all" or department ID
  ownerId: string; // "all" or user ID
}

const RenewalManagementPage: React.FC = () => {
  const [allSoftware, setAllSoftware] = useState<Software[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<RenewalFilter>({ month: 'all', departmentId: 'all', ownerId: 'all' });
  // const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list'); // Calendar view future enhancement

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [sList, uList, dList] = await Promise.all([
          getSoftwareList(),
          getUsers(),
          getDepartments(),
        ]);
        setAllSoftware(sList.filter(s => s.status === SoftwareStatus.ACTIVE));
        setUsers(uList);
        setDepartments(dList);
      } catch (error) {
        console.error("Error fetching renewal data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const monthOptions: SelectOption[] = useMemo(() => {
    const options: SelectOption[] = [{ value: 'all', label: 'All Months' }];
    const uniqueMonths = new Set<string>();
    allSoftware.forEach(s => {
        const monthYear = formatDateSafely(s.renewalDate, 'yyyy-MM');
        uniqueMonths.add(monthYear);
    });
    Array.from(uniqueMonths).sort().forEach(my => {
        options.push({ value: my, label: formatDateSafely(my + '-01', 'MMMM yyyy') });
    });
    return options;
  }, [allSoftware]);

  const departmentOptions: SelectOption[] = [{ value: 'all', label: 'All Departments' }, ...departments.map(d => ({ value: d.id, label: d.name }))];
  const ownerOptions: SelectOption[] = [{ value: 'all', label: 'All Owners' }, ...users.map(u => ({ value: u.id, label: u.name }))];
  
  const filteredRenewals = useMemo(() => {
    return allSoftware
      .map(s => ({...s, renewalDateObj: safeParseDateString(s.renewalDate)})) // Add renewalDateObj for sorting
      .filter(s => {
        const renewalDate = s.renewalDateObj;
        if (filters.month !== 'all') {
          const selectedMonthStart = startOfMonth(new Date(filters.month + '-01'));
          const selectedMonthEnd = endOfMonth(new Date(filters.month + '-01'));
          if (renewalDate < selectedMonthStart || renewalDate > selectedMonthEnd) return false;
        }
        if (filters.departmentId !== 'all' && !s.departmentIds.includes(filters.departmentId)) return false;
        if (filters.ownerId !== 'all' && s.ownerId !== filters.ownerId) return false;
        return true;
      })
      .sort((a, b) => a.renewalDateObj.getTime() - b.renewalDateObj.getTime());
  }, [allSoftware, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const getUrgencyColor = (renewalDateStr: string, noticePeriod: NoticePeriod): 'red' | 'yellow' | 'green' | 'blue' => {
    const renewalDate = safeParseDateString(renewalDateStr);
    const today = new Date();
    const daysUntilRenewal = differenceInDays(renewalDate, today);

    let noticeDays = 0;
    if (noticePeriod === NoticePeriod.DAYS_30) noticeDays = 30;
    else if (noticePeriod === NoticePeriod.DAYS_60) noticeDays = 60;
    else if (noticePeriod === NoticePeriod.DAYS_90) noticeDays = 90;
    
    const noticeDeadline = new Date(renewalDate);
    noticeDeadline.setDate(renewalDate.getDate() - noticeDays);

    if (today >= noticeDeadline && today <= renewalDate) return 'red'; // Within notice period or past due for notice
    if (daysUntilRenewal <= (noticeDays + 30) && noticeDays > 0) return 'yellow'; // Approaching notice period
    if (daysUntilRenewal <= 30) return 'yellow'; // Renewal soon, no specific notice
    if (daysUntilRenewal <= 90) return 'blue';
    return 'green'; // Far off
  };
  
  const getNoticeDeadline = (renewalDateStr: string, noticePeriod: NoticePeriod): Date | null => {
    const renewalDate = safeParseDateString(renewalDateStr);
    let noticeDays = 0;
    if (noticePeriod === NoticePeriod.DAYS_30) noticeDays = 30;
    else if (noticePeriod === NoticePeriod.DAYS_60) noticeDays = 60;
    else if (noticePeriod === NoticePeriod.DAYS_90) noticeDays = 90;
    
    if (noticeDays === 0) return null;
    
    const noticeDeadline = new Date(renewalDate);
    noticeDeadline.setDate(renewalDate.getDate() - noticeDays);
    return noticeDeadline;
  };


  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <Header title="Renewal Management" />
      
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Select label="Filter by Month" name="month" options={monthOptions} value={filters.month} onChange={handleFilterChange} />
          <Select label="Filter by Department" name="departmentId" options={departmentOptions} value={filters.departmentId} onChange={handleFilterChange} />
          <Select label="Filter by Owner" name="ownerId" options={ownerOptions} value={filters.ownerId} onChange={handleFilterChange} />
          {/* Toggle for List/Calendar view could go here */}
        </div>
      </Card>

      {filteredRenewals.length === 0 ? (
        <EmptyState title="No renewals found" message="Try adjusting your filters or add software with upcoming renewals." />
      ) : (
        <div className="space-y-4">
          {filteredRenewals.map(software => {
            const ownerName = users.find(u => u.id === software.ownerId)?.name || 'N/A';
            const noticeDeadline = getNoticeDeadline(software.renewalDate, software.noticePeriod);
            return (
              <Card key={software.id} className="hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <Link to={`/software/${software.id}`} className="text-lg font-semibold text-brand-blue hover:underline">{software.name}</Link>
                    <p className="text-sm text-text-secondary">Vendor: {software.vendor}</p>
                    <p className="text-sm text-text-secondary">Owner: {ownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Renewal Date:</p>
                    <Badge text={formatDateSafely(software.renewalDate, 'MMM d, yyyy')} color={getUrgencyColor(software.renewalDate, software.noticePeriod)} />
                    <p className="text-xs text-text-secondary">{getDaysDifference(software.renewalDate)} days remaining</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Notice Deadline:</p>
                    {noticeDeadline ? (
                      <>
                        <Badge text={format(noticeDeadline, 'MMM d, yyyy')} color={new Date() >= noticeDeadline ? 'red' : 'gray'} />
                        <p className="text-xs text-text-secondary">{software.noticePeriod} notice required</p>
                      </>
                    ) : (
                      <p className="text-sm text-text-secondary">None</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
};

export default RenewalManagementPage;
