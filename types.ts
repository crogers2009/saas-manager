
export enum SoftwareStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  PENDING_APPROVAL = 'Pending Approval',
}

export enum PaymentFrequency {
  MONTHLY = 'Monthly',
  ANNUALLY = 'Annually',
  ONE_TIME = 'One Time',
}

export enum NoticePeriod {
  NONE = 'None',
  DAYS_30 = '30 Days',
  DAYS_60 = '60 Days',
  DAYS_90 = '90 Days',
}

export enum AuditFrequency {
  NONE = 'None',
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly',
  ANNUALLY = 'Annually',
}

export enum LicenseType {
  PER_USER_SEAT = 'Per User/Seat',
  SITE_LICENSE = 'Site License',
  USAGE_BASED = 'Usage-Based',
  PERPETUAL = 'Perpetual',
  FREEMIUM = 'Freemium',
  OTHER = 'Other',
}

export enum RequestType {
  SPECIFIC_SOFTWARE = 'Specific Software',
  GENERAL_NEED = 'General Need',
}

export enum RequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum DocumentType {
  CONTRACT = 'Contract',
  INVOICE = 'Invoice',
  CORRESPONDENCE = 'Correspondence',
  OTHER = 'Other',
}

export enum UserRole {
  ADMIN = 'Administrator',
  SOFTWARE_OWNER = 'Software Owner',
  DEPARTMENT_HEAD = 'Department Head',
}

export enum NotificationType {
  RENEWAL_REMINDER = 'Renewal Reminder',
  AUDIT_DUE = 'Audit Due',
  CONTRACT_EXPIRING = 'Contract Expiring',
  LICENSE_UTILIZATION = 'License Utilization',
  UTILIZATION_WARNING = 'Utilization Warning',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string; // For Department Heads
  password?: string; // Only for creation/updates, not returned in responses
  createdAt?: string;
  lastLogin?: string;
  isActive?: boolean;
}

export interface Department {
  id: string;
  name: string;
}

export interface FeatureTag {
  id: string;
  name: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: DocumentType;
  uploadDate: string; // ISO date string
  file?: File; // For handling actual file object during upload
  fileUrl?: string; // URL for downloading/viewing the file
  filePath?: string; // Server-side file path
  fileSize?: number; // File size in bytes
  mimeType?: string; // MIME type of the file
}

export interface Integration {
  id: string;
  linkedSoftwareId?: string; // ID of another software in the system
  externalIntegrationName?: string;
  notes: string;
}

export interface Software {
  id: string;
  name: string;
  vendor: string;
  description: string;
  ownerId: string; // User ID
  departmentIds: string[]; // Department IDs
  cost: number;
  paymentFrequency: PaymentFrequency;
  status: SoftwareStatus;
  featureTagIds: string[]; // FeatureTag IDs
  contractStartDate: string; // ISO date string
  renewalDate: string; // ISO date string (combines renewal date and contract end date)
  noticePeriod: NoticePeriod;
  autoRenewal: boolean;
  integrations: Integration[];
  documents: DocumentFile[];
  licenseType: LicenseType;
  // Per User/Seat licensing
  seatsPurchased?: number;
  seatsUtilized?: number;
  // Usage-Based licensing
  usageMetric?: string; // e.g., "API calls", "Storage GB", "Transactions"
  usageLimit?: number;
  currentUsage?: number;
  // Site License
  sitesLicensed?: number;
  // Other/Custom
  licenseNotes?: string;
  // Account Executive and Support Information
  accountExecutive?: string; // Name of the account executive
  accountExecutiveEmail?: string; // Email of the account executive
  supportWebsite?: string; // Support website URL
  supportEmail?: string; // Support email address
  // Audit Scheduling
  auditFrequency: AuditFrequency; // How often audits should be scheduled
}

export interface SoftwareRequest {
  id: string;
  type: RequestType;
  requesterId: string; // User ID
  requestDate: string; // ISO date string
  status: RequestStatus;
  businessJustification: string;
  // Specific Software
  softwareName?: string;
  vendorName?: string; // Renamed from vendor to avoid conflict
  estimatedCost?: number;
  numUsersNeeded?: number;
  // General Need
  problemToSolve?: string;
  currentPainPoints?: string;
  featureRequirements?: string;
  budgetRange?: string;
  timeline?: string;
}

export interface AuditChecklist {
  verifyActiveUsers: boolean;
  checkSeatUtilization: boolean;
  reviewFeatureUsage: boolean;
  updateDepartmentAllocation: boolean;
  // Completed status for each item
  verifyActiveUsersCompleted?: boolean;
  checkSeatUtilizationCompleted?: boolean;
  reviewFeatureUsageCompleted?: boolean;
  updateDepartmentAllocationCompleted?: boolean;
}

export interface Audit {
  id: string;
  softwareId: string;
  scheduledDate: string; // ISO date string
  completedDate?: string; // ISO date string
  frequency: AuditFrequency;
  notes?: string;
  checklist: AuditChecklist;
  // Current usage data captured during audit
  currentSeatsUsed?: number;
  currentUsageAmount?: number;
  usageMetricSnapshot?: string; // What was being measured at time of audit
  auditFindings?: string; // Additional findings/observations
  recommendedActions?: string; // Recommended actions based on audit
}

// Props for common components
export interface SelectOption {
  value: string | number;
  label: string;
}

// For API responses that list items
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  message: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

// SMTP Configuration
export interface SMTPConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean; // true for SSL/TLS, false for STARTTLS
  username: string;
  password: string; // Will be encrypted in storage
  fromEmail: string;
  fromName: string;
  isActive: boolean;
  testEmailSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

// User Notification Preferences
export interface NotificationPreference {
  id: string;
  userId: string;
  notificationType: NotificationType;
  isEnabled: boolean;
  daysBefore?: number; // For renewal/contract reminders
  emailAddress?: string; // Override user's default email
  utilizationThreshold?: number; // For utilization warning (50, 75, 90, 100)
}

// Email Notification Queue/Log
export interface EmailNotification {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  notificationType: NotificationType;
  relatedEntityId?: string; // Software ID, Audit ID, etc.
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  createdAt: string;
}
