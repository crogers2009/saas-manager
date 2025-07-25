import { Software, User, Department, FeatureTag, Audit, SoftwareRequest, DocumentFile, Integration, SMTPConfig, NotificationPreference, EmailNotification } from '../types';

// Dynamic API base URL that works in both development and production
const getApiBaseUrl = () => {
  // In production, use the same origin as the frontend
  if (typeof window !== 'undefined') {
    // Browser environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development environment
      return 'http://localhost:3001/api';
    } else {
      // Production environment - use same origin with /api path
      return `${window.location.protocol}//${window.location.host}/api`;
    }
  }
  
  // Fallback for server-side rendering or other environments
  return process.env.NODE_ENV === 'production' 
    ? '/api'  // Relative URL for production
    : 'http://localhost:3001/api'; // Development fallback
};

// Generic fetch helper
export const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const API_BASE_URL = getApiBaseUrl(); // Call it here so it's dynamic
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// --- Users ---
export const getUsers = (): Promise<User[]> => apiRequest<User[]>('/users');
export const getUserById = (id: string): Promise<User> => apiRequest<User>(`/users/${id}`);

// --- Departments ---
export const getDepartments = (): Promise<Department[]> => apiRequest<Department[]>('/departments');
export const getDepartmentById = (id: string): Promise<Department> => apiRequest<Department>(`/departments/${id}`);
export const addDepartment = (departmentData: { name: string }): Promise<Department> =>
  apiRequest<Department>('/departments', {
    method: 'POST',
    body: JSON.stringify(departmentData),
  });
export const updateDepartment = (id: string, updates: { name: string }): Promise<Department> =>
  apiRequest<Department>(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
export const deleteDepartment = (id: string): Promise<{ message: string }> =>
  apiRequest<{ message: string }>(`/departments/${id}`, {
    method: 'DELETE',
  });

// --- Feature Tags ---
export const getFeatureTags = (): Promise<FeatureTag[]> => apiRequest<FeatureTag[]>('/feature-tags');
export const getFeatureTagById = (id: string): Promise<FeatureTag> => apiRequest<FeatureTag>(`/feature-tags/${id}`);
export const addFeatureTag = (name: string): Promise<FeatureTag> => 
  apiRequest<FeatureTag>('/feature-tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

// --- Software ---
export const getSoftwareList = (): Promise<Software[]> => apiRequest<Software[]>('/software');
export const getSoftwareById = (id: string): Promise<Software> => apiRequest<Software>(`/software/${id}`);

export const addSoftware = (softwareData: Omit<Software, 'id' | 'integrations' | 'documents'>): Promise<Software> =>
  apiRequest<Software>('/software', {
    method: 'POST',
    body: JSON.stringify(softwareData),
  });

export const updateSoftware = (id: string, updates: Partial<Software>): Promise<Software> =>
  apiRequest<Software>(`/software/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

export const deleteSoftware = (id: string): Promise<{ message: string }> =>
  apiRequest<{ message: string }>(`/software/${id}`, {
    method: 'DELETE',
  });

// --- Documents for Software ---
export const addDocumentToSoftware = (softwareId: string, documentData: Omit<DocumentFile, 'id'>): Promise<Software> =>
  apiRequest<Software>(`/software/${softwareId}/documents`, {
    method: 'POST',
    body: JSON.stringify(documentData),
  });

// Upload document file to software
export const uploadDocumentToSoftware = async (
  softwareId: string, 
  file: File, 
  documentName: string, 
  documentType: string,
  softwareName: string
): Promise<Software> => {
  const API_BASE_URL = getApiBaseUrl(); // Call it here so it's dynamic
  const url = `${API_BASE_URL}/software/${softwareId}/documents`;
  
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', documentName);
  formData.append('type', documentType);
  formData.append('softwareName', softwareName);
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'File upload failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export const deleteDocumentFromSoftware = (softwareId: string, documentId: string): Promise<Software> =>
  apiRequest<Software>(`/software/${softwareId}/documents/${documentId}`, {
    method: 'DELETE',
  });

// --- Integrations for Software ---
export const addIntegrationToSoftware = (softwareId: string, integrationData: Omit<Integration, 'id'>): Promise<Software> =>
  apiRequest<Software>(`/software/${softwareId}/integrations`, {
    method: 'POST',
    body: JSON.stringify(integrationData),
  });

export const deleteIntegrationFromSoftware = (softwareId: string, integrationId: string): Promise<Software> =>
  apiRequest<Software>(`/software/${softwareId}/integrations/${integrationId}`, {
    method: 'DELETE',
  });

// --- Audits ---
export const getAudits = (): Promise<Audit[]> => apiRequest<Audit[]>('/audits');
export const getAuditsForSoftware = (softwareId: string): Promise<Audit[]> => 
  apiRequest<Audit[]>(`/audits/software/${softwareId}`);

export const addAudit = (auditData: Omit<Audit, 'id'>): Promise<Audit> =>
  apiRequest<Audit>('/audits', {
    method: 'POST',
    body: JSON.stringify(auditData),
  });

export const updateAudit = (id: string, updates: Partial<Audit>): Promise<Audit> =>
  apiRequest<Audit>(`/audits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

// --- Software Requests ---
export const getSoftwareRequests = (): Promise<SoftwareRequest[]> => apiRequest<SoftwareRequest[]>('/requests');
export const getSoftwareRequestById = (id: string): Promise<SoftwareRequest> => 
  apiRequest<SoftwareRequest>(`/requests/${id}`);

export const addSoftwareRequest = (requestData: Omit<SoftwareRequest, 'id' | 'requestDate' | 'status'>): Promise<SoftwareRequest> =>
  apiRequest<SoftwareRequest>('/requests', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });

export const updateSoftwareRequest = (id: string, updates: Partial<SoftwareRequest>): Promise<SoftwareRequest> =>
  apiRequest<SoftwareRequest>(`/requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

// Dashboard specific data
export const getDashboardStats = (): Promise<{
  totalActiveSubscriptions: number;
  monthlySpend: number;
  annualSpend: number;
  upcomingRenewalsCount: number;
  recentRequestsCount: number;
  totalVendors: number;
  totalDepartments: number;
}> => apiRequest('/dashboard/stats');

// --- SMTP Configuration (Admin only) ---
export const getSMTPConfig = (): Promise<SMTPConfig> => apiRequest<SMTPConfig>('/email/smtp-config');
export const updateSMTPConfig = (config: SMTPConfig): Promise<SMTPConfig> =>
  apiRequest<SMTPConfig>('/email/smtp-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
export const testSMTPConnection = (config: SMTPConfig): Promise<{ success: boolean; message: string }> =>
  apiRequest<{ success: boolean; message: string }>('/email/test-smtp', {
    method: 'POST',
    body: JSON.stringify(config),
  });

// --- Notification Preferences ---
export const getUserNotificationPreferences = (userId: string): Promise<NotificationPreference[]> =>
  apiRequest<NotificationPreference[]>(`/email/preferences/${userId}`);
export const updateNotificationPreferences = (userId: string, preferences: NotificationPreference[]): Promise<NotificationPreference[]> =>
  apiRequest<NotificationPreference[]>(`/email/preferences/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });

// --- Email Notifications ---
export const getEmailNotifications = (): Promise<EmailNotification[]> => 
  apiRequest<EmailNotification[]>('/email/notifications');
export const sendTestEmail = (recipientEmail: string): Promise<{ success: boolean; message: string }> =>
  apiRequest<{ success: boolean; message: string }>('/email/send-test', {
    method: 'POST',
    body: JSON.stringify({ recipientEmail }),
  });