import React from 'react';
import { ContractHistory } from '../types';
import { differenceInDays } from 'date-fns';
import { formatDateSafely } from '../utils/dateUtils';
import Card from './Card';
import Badge from './Badge';

interface ContractHistoryCardProps {
  history: ContractHistory[];
}

const ContractHistoryCard: React.FC<ContractHistoryCardProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <Card title="Contract History">
        <p className="text-text-secondary text-sm">No contract history available.</p>
      </Card>
    );
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date(startDate));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    
    if (years > 0) {
      return months > 0 ? `${years}y ${months}m` : `${years}y`;
    } else if (months > 0) {
      return `${months}m`;
    } else {
      return `${days}d`;
    }
  };

  const getStatusColor = (status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' => {
    switch (status) {
      case 'Renewed': return 'green';
      case 'Expired': return 'red';
      case 'Active': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Card title="Contract History" className="mb-6">
      <div className="space-y-4">
        {history.map((contract, index) => {
          const isLatest = index === 0;
          const duration = calculateDuration(contract.contractStartDate, contract.contractEndDate);
          
          return (
            <div 
              key={contract.id} 
              className={`border rounded-lg p-4 ${isLatest ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-text-primary">
                      {formatDateSafely(contract.contractStartDate, 'MMM d, yyyy')} - {formatDateSafely(contract.contractEndDate, 'MMM d, yyyy')}
                    </h4>
                    <Badge text={contract.status} color={getStatusColor(contract.status)} />
                    <span className="text-sm text-text-secondary">({duration})</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-text-secondary">Cost:</span>
                      <span className="ml-2">${contract.cost.toLocaleString()} {contract.paymentFrequency}</span>
                    </div>
                    <div>
                      <span className="font-medium text-text-secondary">Notice Period:</span>
                      <span className="ml-2">{contract.noticePeriod}</span>
                    </div>
                    <div>
                      <span className="font-medium text-text-secondary">Auto-Renew:</span>
                      <span className="ml-2">{contract.autoRenewal ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  
                  {contract.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-text-secondary">{contract.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="text-right text-sm text-text-secondary ml-4">
                  <div>Recorded:</div>
                  <div>{formatDateSafely(contract.createdAt, 'MMM d, yyyy')}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {history.length > 1 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-text-primary">${history[0].cost.toLocaleString()}</div>
              <div className="text-text-secondary">Current Cost</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-text-primary">${history[history.length - 1].cost.toLocaleString()}</div>
              <div className="text-text-secondary">Original Cost</div>
            </div>
            <div className="text-center">
              {(() => {
                const currentCost = history[0].cost;
                const originalCost = history[history.length - 1].cost;
                const totalChange = currentCost - originalCost;
                const percentChange = originalCost > 0 ? ((totalChange / originalCost) * 100) : 0;
                
                return (
                  <>
                    <div className={`font-medium ${totalChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {totalChange >= 0 ? '+' : ''}${totalChange.toLocaleString()} ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                    </div>
                    <div className="text-text-secondary">Total Change</div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ContractHistoryCard;