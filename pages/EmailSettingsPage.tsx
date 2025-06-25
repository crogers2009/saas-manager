import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { SMTPConfig, NotificationPreference, NotificationType } from '../types';
import { getSMTPConfig, updateSMTPConfig, testSMTPConnection, getUserNotificationPreferences, updateNotificationPreferences } from '../services/apiService';

const EmailSettingsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [smtpConfig, setSMTPConfig] = useState<Partial<SMTPConfig>>({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    isActive: false,
  });
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const [smtp, preferences] = await Promise.all([
          isAdmin ? getSMTPConfig() : Promise.resolve(null),
          getUserNotificationPreferences(user?.id || '')
        ]);
        
        if (smtp) {
          setSMTPConfig(smtp);
        }
        setNotificationPrefs(preferences);
      } catch (error) {
        console.error('Error fetching email settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user, isAdmin]);

  const handleSMTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSMTPConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
    }));
  };

  const handleSMTPSave = async () => {
    try {
      setIsSaving(true);
      await updateSMTPConfig(smtpConfig as SMTPConfig);
      // Show success message or toast
    } catch (error) {
      console.error('Error saving SMTP config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await testSMTPConnection(smtpConfig as SMTPConfig);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: 'Test failed: ' + (error as Error).message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleNotificationToggle = (notificationType: NotificationType, isEnabled: boolean) => {
    setNotificationPrefs(prev => {
      const existing = prev.find(p => p.notificationType === notificationType);
      if (existing) {
        return prev.map(p => 
          p.notificationType === notificationType 
            ? { ...p, isEnabled }
            : p
        );
      } else {
        return [...prev, {
          id: crypto.randomUUID(),
          userId: user?.id || '',
          notificationType,
          isEnabled,
          daysBefore: notificationType === NotificationType.RENEWAL_REMINDER ? 30 : undefined
        }];
      }
    });
  };

  const handleDaysBeforeChange = (notificationType: NotificationType, daysBefore: number) => {
    setNotificationPrefs(prev => 
      prev.map(p => 
        p.notificationType === notificationType 
          ? { ...p, daysBefore }
          : p
      )
    );
  };

  const handleUtilizationThresholdChange = (threshold: number) => {
    setNotificationPrefs(prev => {
      const existing = prev.find(p => p.notificationType === NotificationType.UTILIZATION_WARNING);
      if (existing) {
        return prev.map(p => 
          p.notificationType === NotificationType.UTILIZATION_WARNING 
            ? { ...p, utilizationThreshold: threshold }
            : p
        );
      } else {
        return [...prev, {
          id: crypto.randomUUID(),
          userId: user?.id || '',
          notificationType: NotificationType.UTILIZATION_WARNING,
          isEnabled: false,
          utilizationThreshold: threshold
        }];
      }
    });
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true);
      await updateNotificationPreferences(user?.id || '', notificationPrefs);
      // Show success message
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const getNotificationPref = (type: NotificationType) => {
    return notificationPrefs.find(p => p.notificationType === type);
  };

  return (
    <>
      <Header title="Email Settings" />
      
      <div className="space-y-6">
        {isAdmin && (
          <Card title="SMTP Configuration" subtitle="Configure email server settings for sending notifications">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="SMTP Host"
                name="host"
                value={smtpConfig.host || ''}
                onChange={handleSMTPChange}
                placeholder="smtp.gmail.com"
                required
              />
              <Input
                label="Port"
                name="port"
                type="number"
                value={smtpConfig.port || ''}
                onChange={handleSMTPChange}
                placeholder="587"
                required
              />
              <Input
                label="Username"
                name="username"
                value={smtpConfig.username || ''}
                onChange={handleSMTPChange}
                placeholder="your-email@domain.com"
                required
              />
              <Input
                label="Password"
                name="password"
                type="password"
                value={smtpConfig.password || ''}
                onChange={handleSMTPChange}
                placeholder="Your email password or app password"
                required
              />
              <Input
                label="From Email"
                name="fromEmail"
                type="email"
                value={smtpConfig.fromEmail || ''}
                onChange={handleSMTPChange}
                placeholder="noreply@yourcompany.com"
                required
              />
              <Input
                label="From Name"
                name="fromName"
                value={smtpConfig.fromName || ''}
                onChange={handleSMTPChange}
                placeholder="SaaS Manager"
                required
              />
            </div>
            
            <div className="mt-4 flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="secure"
                  checked={smtpConfig.secure || false}
                  onChange={handleSMTPChange}
                  className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                />
                <span className="ml-2 text-sm text-text-primary">Use SSL/TLS (port 465)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={smtpConfig.isActive || false}
                  onChange={handleSMTPChange}
                  className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                />
                <span className="ml-2 text-sm text-text-primary">Enable email notifications</span>
              </label>
            </div>

            {testResult && (
              <div className={`mt-4 p-3 rounded-md ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testResult.message}
              </div>
            )}
            
            <div className="mt-6 flex space-x-3">
              <Button
                variant="primary"
                onClick={handleSMTPSave}
                isLoading={isSaving}
                disabled={isSaving}
              >
                Save Configuration
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                isLoading={isTesting}
                disabled={isTesting || !smtpConfig.host}
              >
                Test Connection
              </Button>
            </div>
          </Card>
        )}

        <Card title="Notification Preferences" subtitle="Choose which email notifications you want to receive">
          <div className="space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Renewal Reminders</h4>
                <p className="text-sm text-text-secondary">Get notified when software renewals are approaching</p>
              </div>
              <div className="flex items-center space-x-4">
                <Input
                  label="Days before"
                  type="number"
                  value={getNotificationPref(NotificationType.RENEWAL_REMINDER)?.daysBefore || 30}
                  onChange={(e) => handleDaysBeforeChange(NotificationType.RENEWAL_REMINDER, parseInt(e.target.value))}
                  className="w-20"
                  min="1"
                  max="365"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={getNotificationPref(NotificationType.RENEWAL_REMINDER)?.isEnabled || false}
                    onChange={(e) => handleNotificationToggle(NotificationType.RENEWAL_REMINDER, e.target.checked)}
                    className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                  />
                  <span className="ml-2 text-sm text-text-primary">Enable</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Contract Expiration</h4>
                <p className="text-sm text-text-secondary">Get notified when contracts are expiring</p>
              </div>
              <div className="flex items-center space-x-4">
                <Input
                  label="Days before"
                  type="number"
                  value={getNotificationPref(NotificationType.CONTRACT_EXPIRING)?.daysBefore || 60}
                  onChange={(e) => handleDaysBeforeChange(NotificationType.CONTRACT_EXPIRING, parseInt(e.target.value))}
                  className="w-20"
                  min="1"
                  max="365"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={getNotificationPref(NotificationType.CONTRACT_EXPIRING)?.isEnabled || false}
                    onChange={(e) => handleNotificationToggle(NotificationType.CONTRACT_EXPIRING, e.target.checked)}
                    className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                  />
                  <span className="ml-2 text-sm text-text-primary">Enable</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="text-sm font-medium text-text-primary">License Utilization Alerts</h4>
                <p className="text-sm text-text-secondary">Get notified when license utilization is high</p>
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={getNotificationPref(NotificationType.LICENSE_UTILIZATION)?.isEnabled || false}
                  onChange={(e) => handleNotificationToggle(NotificationType.LICENSE_UTILIZATION, e.target.checked)}
                  className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                />
                <span className="ml-2 text-sm text-text-primary">Enable</span>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Utilization Warnings</h4>
                <p className="text-sm text-text-secondary">Get notified when software utilization exceeds your threshold</p>
              </div>
              <div className="flex items-center space-x-4">
                <Select
                  label="Threshold"
                  value={getNotificationPref(NotificationType.UTILIZATION_WARNING)?.utilizationThreshold || 75}
                  onChange={(e) => handleUtilizationThresholdChange(parseInt(e.target.value))}
                  options={[
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                    { value: 90, label: '90%' },
                    { value: 100, label: '100%' }
                  ]}
                  className="w-24"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={getNotificationPref(NotificationType.UTILIZATION_WARNING)?.isEnabled || false}
                    onChange={(e) => handleNotificationToggle(NotificationType.UTILIZATION_WARNING, e.target.checked)}
                    className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                  />
                  <span className="ml-2 text-sm text-text-primary">Enable</span>
                </label>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-sm font-medium text-text-primary">Audit Reminders</h4>
                  <p className="text-sm text-text-secondary">Get notified when audits are due (Admin only)</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Input
                    label="Days before"
                    type="number"
                    value={getNotificationPref(NotificationType.AUDIT_DUE)?.daysBefore || 7}
                    onChange={(e) => handleDaysBeforeChange(NotificationType.AUDIT_DUE, parseInt(e.target.value))}
                    className="w-20"
                    min="1"
                    max="365"
                  />
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={getNotificationPref(NotificationType.AUDIT_DUE)?.isEnabled || false}
                      onChange={(e) => handleNotificationToggle(NotificationType.AUDIT_DUE, e.target.checked)}
                      className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                    />
                    <span className="ml-2 text-sm text-text-primary">Enable</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <Button
              variant="primary"
              onClick={handleSaveNotifications}
              isLoading={isSaving}
              disabled={isSaving}
            >
              Save Notification Preferences
            </Button>
          </div>
        </Card>

        <Card title="Role-Based Notifications" subtitle="How notifications are sent based on your role">
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Notification Rules:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>Administrators:</strong> Receive all notifications for all software and audits</li>
              <li><strong>Department Heads:</strong> Receive notifications for software assigned to their department</li>
              <li><strong>Software Owners:</strong> Receive notifications only for software they own</li>
              <li><strong>Audit Notifications:</strong> Only sent to administrators</li>
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
};

export default EmailSettingsPage;