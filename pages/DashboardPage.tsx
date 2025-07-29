import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import DashboardStatCard from '../components/DashboardStatCard';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { getDashboardStats, getSoftwareList, getSoftwareRequests } from '../services/apiService';
import { Software, SoftwareRequest, SoftwareStatus, RequestStatus } from '../types'; // Added RequestStatus
import { DashboardIcon, SoftwareIcon, RequestIcon, RenewalIcon, PlusIcon } from '../constants';
import { addDays } from 'date-fns';
import { formatDateSafely, getDaysDifference } from '../utils/dateUtils';

interface DashboardData {
  totalActiveSubscriptions: number;
  monthlySpend: number;
  annualSpend: number;
  upcomingRenewalsCount: number;
  recentRequestsCount: number;
  totalVendors: number;
  totalDepartments: number;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [upcomingRenewals, setUpcomingRenewals] = useState<Software[]>([]);
  const [recentRequests, setRecentRequests] = useState<SoftwareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [dashboardStats, allSoftware, allRequests] = await Promise.all([
          getDashboardStats(),
          getSoftwareList(),
          getSoftwareRequests(),
        ]);
        setStats(dashboardStats);

        const today = new Date();
        const sixtyDaysFromNow = addDays(today, 60);
        const filteredRenewals = allSoftware
          .filter(s => s.status === SoftwareStatus.ACTIVE)
          .map(s => ({...s, renewalDateObj: new Date(s.renewalDate)}))
          .filter(s => s.renewalDateObj >= today && s.renewalDateObj <= sixtyDaysFromNow)
          .sort((a, b) => a.renewalDateObj.getTime() - b.renewalDateObj.getTime())
          .slice(0, 5); // Display top 5 upcoming
        setUpcomingRenewals(filteredRenewals);

        const sevenDaysAgo = addDays(today, -7);
        const filteredRequests = allRequests
          .filter(r => new Date(r.requestDate) >= sevenDaysAgo)
          .sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
          .slice(0,5);
        setRecentRequests(filteredRequests);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading || !stats) {
    return <LoadingSpinner />;
  }

  const getRenewalUrgencyColor = (renewalDateStr: string): 'red' | 'yellow' | 'green' => {
    const daysUntilRenewal = getDaysDifference(renewalDateStr);
    if (daysUntilRenewal <= 30) return 'red';
    if (daysUntilRenewal <= 60) return 'yellow';
    return 'green';
  };

  return (
    <>
      <Header title="Dashboard" />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <DashboardStatCard 
          title="Active Subscriptions" 
          value={stats.totalActiveSubscriptions} 
          icon={<SoftwareIcon />} 
          color="text-blue-500"
        />
        <DashboardStatCard 
          title="Monthly Spend" 
          value={`$${stats.monthlySpend.toLocaleString()}`} 
          icon={<DashboardIcon />} 
          color="text-green-500"
        />
        <DashboardStatCard 
          title="Annual Spend" 
          value={`$${stats.annualSpend.toLocaleString()}`} 
          icon={<DashboardIcon />}
          color="text-green-600"
        />
        <DashboardStatCard 
          title="Upcoming Renewals (60d)" 
          value={upcomingRenewals.length} // This will be based on the filtered list, not just stats.upcomingRenewalsCount which is for 30d
          icon={<RenewalIcon />}
          color="text-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Upcoming Renewals */}
        <Card title="Upcoming Renewals (Next 60 Days)">
          {upcomingRenewals.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {upcomingRenewals.map(software => (
                <li key={software.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Link to={`/software/${software.id}`} className="text-brand-blue hover:underline font-medium">{software.name}</Link>
                      {software.autoRenewal && (
                        <Badge text="Auto" color="blue" />
                      )}
                    </div>
                    <Badge text={formatDateSafely(software.renewalDate, 'MMM d, yyyy')} color={getRenewalUrgencyColor(software.renewalDate)} />
                  </div>
                  <p className="text-sm text-text-secondary">{software.vendor} - {getDaysDifference(software.renewalDate)} days</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-secondary">No renewals in the next 60 days.</p>
          )}
          <div className="mt-4 text-right">
            <Button variant="ghost" size="sm">
              <Link to="/renewals">View All Renewals</Link>
            </Button>
          </div>
        </Card>

        {/* Recent Software Requests */}
        <Card title="Recent Software Requests">
           {recentRequests.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentRequests.map(request => (
                <li key={request.id} className="py-3">
                  <div className="flex items-center justify-between">
                     <Link to={`/requests`} className="text-brand-blue hover:underline font-medium">
                        {request.softwareName || request.problemToSolve?.substring(0,30)+"..."}
                    </Link>
                    <Badge text={request.status} color={request.status === RequestStatus.PENDING ? 'yellow' : request.status === RequestStatus.APPROVED ? 'green' : 'red'} />
                  </div>
                  <p className="text-sm text-text-secondary">Requested on: {formatDateSafely(request.requestDate, 'MMM d, yyyy')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-secondary">No recent software requests.</p>
          )}
          <div className="mt-4 text-right">
            <Button variant="primary" size="sm" leftIcon={<PlusIcon />}>
                <Link to="/requests/new">New Request</Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <p className="text-sm font-medium text-text-secondary">Total Vendors</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.totalVendors}</p>
        </Card>
        <Card>
            <p className="text-sm font-medium text-text-secondary">Total Departments</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.totalDepartments}</p>
        </Card>
         <Card>
            <p className="text-sm font-medium text-text-secondary">Recent Pending Requests</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.recentRequestsCount}</p>
        </Card>
      </div>
    </>
  );
};

export default DashboardPage;