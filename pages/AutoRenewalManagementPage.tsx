import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import { getUpcomingRenewals, triggerAutoRenewal, getAutoRenewalStatus } from '../services/apiService';
import { formatDateSafely, getDaysDifference } from '../utils/dateUtils';

interface UpcomingRenewal {
  id: string;
  name: string;
  vendor: string;
  cost: number;
  paymentFrequency: string;
  renewalDate: string;
  autoRenewal: boolean;
  ownerName: string;
  daysUntilRenewal: number;
}

interface AutoRenewalStatus {
  upcomingInNext30Days: number;
  dueToday: number;
  dueThisWeek: number;
  nextRenewal: UpcomingRenewal | null;
  schedulerInfo: {
    timezone: string;
    dailyRunTime: string;
    description: string;
  };
}

const AutoRenewalManagementPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [upcomingRenewals, setUpcomingRenewals] = useState<UpcomingRenewal[]>([]);
  const [status, setStatus] = useState<AutoRenewalStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<any>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [renewals, statusData] = await Promise.all([
        getUpcomingRenewals(30),
        getAutoRenewalStatus()
      ]);
      setUpcomingRenewals(renewals);
      setStatus(statusData);
    } catch (error) {
      console.error('Error fetching auto-renewal data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerRenewal = async () => {
    setIsTriggering(true);
    setTriggerResult(null);
    
    try {
      const result = await triggerAutoRenewal();
      setTriggerResult(result);
      
      // Refresh data after triggering
      await fetchData();
    } catch (error) {
      console.error('Error triggering auto-renewal:', error);
      setTriggerResult({
        error: error instanceof Error ? error.message : 'Failed to trigger auto-renewal'
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const getBadgeColor = (daysUntilRenewal: number): 'red' | 'yellow' | 'green' | 'gray' => {
    if (daysUntilRenewal <= 0) return 'red';
    if (daysUntilRenewal <= 7) return 'yellow';
    if (daysUntilRenewal <= 14) return 'green';
    return 'gray';
  };

  if (!isAdmin) {
    return (
      <>
        <Header title="Access Denied" />
        <EmptyState title="Access Denied" message="You must be an administrator to access auto-renewal management." />
      </>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Header
        title="Auto-Renewal Management"
        actions={
          <Button 
            variant="primary" 
            onClick={handleTriggerRenewal}
            disabled={isTriggering}
          >
            {isTriggering ? 'Processing...' : 'Trigger Auto-Renewals'}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Status Overview */}
        {status && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{status.dueToday}</div>
                <div className="text-sm text-gray-600">Due Today</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{status.dueThisWeek}</div>
                <div className="text-sm text-gray-600">Due This Week</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{status.upcomingInNext30Days}</div>
                <div className="text-sm text-gray-600">Upcoming (30 days)</div>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {status.schedulerInfo.dailyRunTime}
                </div>
                <div className="text-sm text-gray-600">{status.schedulerInfo.timezone}</div>
                <div className="text-xs text-gray-500 mt-1">Daily Auto-Run</div>
              </div>
            </Card>
          </div>
        )}

        {/* Trigger Result */}
        {triggerResult && (
          <Card>
            {triggerResult.error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <h4 className="font-medium">Auto-Renewal Failed</h4>
                <p className="text-sm mt-1">{triggerResult.error}</p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                <h4 className="font-medium">Auto-Renewal Completed</h4>
                <p className="text-sm mt-1">
                  {triggerResult.renewedCount} contracts renewed out of {triggerResult.totalProcessed} processed
                </p>
                {triggerResult.results && triggerResult.results.length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-medium text-sm mb-2">Results:</h5>
                    <ul className="text-sm space-y-1">
                      {triggerResult.results.map((result: any, index: number) => (
                        <li key={index} className={result.success ? 'text-green-600' : 'text-red-600'}>
                          {result.success ? '✓' : '✗'} {result.softwareName}: {
                            result.success 
                              ? `Renewed until ${formatDateSafely(result.newContractEnd, 'MMM d, yyyy')}`
                              : result.error
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Scheduler Info */}
        {status && (
          <Card title="Scheduler Information">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
              <p className="text-sm">
                <strong>Automatic Processing:</strong> {status.schedulerInfo.description}
              </p>
              <p className="text-xs mt-1">
                Contracts with auto-renewal enabled will be automatically processed when their renewal date arrives.
                New contract periods will start on the renewal date and extend based on the payment frequency.
              </p>
            </div>
          </Card>
        )}

        {/* Upcoming Renewals */}
        <Card title="Upcoming Auto-Renewals (Next 30 Days)">
          {upcomingRenewals.length === 0 ? (
            <EmptyState
              title="No upcoming auto-renewals"
              message="There are no contracts with auto-renewal enabled due in the next 30 days."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Software
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Renewal Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Until
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingRenewals.map((renewal) => (
                    <tr key={renewal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {renewal.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {renewal.vendor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${renewal.cost.toLocaleString()} / {renewal.paymentFrequency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateSafely(renewal.renewalDate, 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          text={renewal.daysUntilRenewal === 0 ? 'Today' : `${renewal.daysUntilRenewal} days`}
                          color={getBadgeColor(renewal.daysUntilRenewal)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {renewal.ownerName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default AutoRenewalManagementPage;