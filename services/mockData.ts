
import { Software, User, Department, FeatureTag, Audit, SoftwareRequest, SoftwareStatus, PaymentFrequency, NoticePeriod, AuditFrequency, RequestType, RequestStatus, DocumentType, UserRole } from '../types';

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Admin User', email: 'admin@faie.com', role: UserRole.ADMIN },
  { id: 'user-2', name: 'Alice Wonderland', email: 'alice@faie.com', role: UserRole.SOFTWARE_OWNER },
  { id: 'user-3', name: 'Bob The Builder', email: 'bob@faie.com', role: UserRole.DEPARTMENT_HEAD },
  { id: 'user-4', name: 'Carol Danvers', email: 'carol@faie.com', role: UserRole.SOFTWARE_OWNER },
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'Engineering' },
  { id: 'dept-2', name: 'Marketing' },
  { id: 'dept-3', name: 'Sales' },
  { id: 'dept-4', name: 'HR' },
  { id: 'dept-5', name: 'Finance' },
];

export const MOCK_FEATURE_TAGS: FeatureTag[] = [
  { id: 'tag-1', name: 'Project Management' },
  { id: 'tag-2', name: 'CRM' },
  { id: 'tag-3', name: 'Payroll' },
  { id: 'tag-4', name: 'Communication' },
  { id: 'tag-5', name: 'Design' },
  { id: 'tag-6', name: 'Analytics' },
  { id: 'tag-7', name: 'Cloud Storage' },
  { id: 'tag-8', name: 'Security' },
];

export const MOCK_SOFTWARE: Software[] = [
  {
    id: 'sw-1',
    name: 'Jira',
    vendor: 'Atlassian',
    description: 'Project tracking and issue management software.',
    ownerId: 'user-2',
    departmentIds: ['dept-1', 'dept-2'],
    cost: 500, // Total cost
    paymentFrequency: PaymentFrequency.MONTHLY,
    status: SoftwareStatus.ACTIVE,
    featureTagIds: ['tag-1'],
    contractStartDate: new Date(new Date().getFullYear() - 1, new Date().getMonth() + 2, 15).toISOString(),
    renewalDate: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 15).toISOString(),
    noticePeriod: NoticePeriod.DAYS_60,
    autoRenewal: true,
    integrations: [
      { id: 'int-1', externalIntegrationName: 'Slack', notes: 'Notifications for new issues.' },
      { id: 'int-2', externalIntegrationName: 'GitHub', notes: 'Commit linking.' }
    ],
    contractHistory: [],
    documents: [
      { id: 'doc-1', name: 'Jira Contract 2023.pdf', type: DocumentType.CONTRACT, uploadDate: new Date('2023-03-15').toISOString(), fileUrl: '#' },
      { id: 'doc-2', name: 'Jira Invoice Mar2024.pdf', type: DocumentType.INVOICE, uploadDate: new Date('2024-03-01').toISOString(), fileUrl: '#' },
    ],
    purchasedBySeat: true,
    seatsPurchased: 50,
    seatsUtilized: 45,
  },
  {
    id: 'sw-2',
    name: 'Salesforce',
    vendor: 'Salesforce Inc.',
    description: 'Customer Relationship Management platform.',
    ownerId: 'user-4',
    departmentIds: ['dept-3', 'dept-2'],
    cost: 2500, // Total cost
    paymentFrequency: PaymentFrequency.MONTHLY,
    status: SoftwareStatus.ACTIVE,
    featureTagIds: ['tag-2', 'tag-6'],
    contractStartDate: new Date(new Date().getFullYear() - 2, new Date().getMonth() + 1, 1).toISOString(),
    renewalDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    noticePeriod: NoticePeriod.DAYS_90,
    autoRenewal: true,
    integrations: [
      { id: 'int-3', externalIntegrationName: 'Marketo', notes: 'Lead sync.' }
    ],
    contractHistory: [],
    documents: [
       { id: 'doc-3', name: 'Salesforce MSA.pdf', type: DocumentType.CONTRACT, uploadDate: new Date('2022-07-01').toISOString(), fileUrl: '#' },
    ],
    purchasedBySeat: true,
    seatsPurchased: 20,
    seatsUtilized: 18,
  },
  {
    id: 'sw-3',
    name: 'Figma',
    vendor: 'Figma Inc.',
    description: 'Collaborative interface design tool.',
    ownerId: 'user-2',
    departmentIds: ['dept-1', 'dept-2'],
    cost: 120, // Total cost
    paymentFrequency: PaymentFrequency.MONTHLY,
    status: SoftwareStatus.ACTIVE,
    featureTagIds: ['tag-5'],
    contractStartDate: new Date(new Date().getFullYear() - 1, new Date().getMonth() + 4, 10).toISOString(),
    renewalDate: new Date(new Date().getFullYear(), new Date().getMonth() + 4, 10).toISOString(),
    noticePeriod: NoticePeriod.DAYS_30,
    autoRenewal: false,
    integrations: [],
    contractHistory: [],
    documents: [],
    purchasedBySeat: true,
    seatsPurchased: 10,
    seatsUtilized: 8,
  },
  {
    id: 'sw-4',
    name: 'Slack',
    vendor: 'Salesforce Inc.',
    description: 'Team communication platform.',
    ownerId: 'user-3',
    departmentIds: ['dept-1', 'dept-2', 'dept-3', 'dept-4', 'dept-5'],
    cost: 800, // Total cost
    paymentFrequency: PaymentFrequency.ANNUALLY,
    status: SoftwareStatus.ACTIVE,
    featureTagIds: ['tag-4'],
    contractStartDate: new Date(new Date().getFullYear() - 1, new Date().getMonth() + 0, 20).toISOString(),
    renewalDate: new Date(new Date().getFullYear(), new Date().getMonth() + 0, 20).toISOString(), // Renewal soon
    noticePeriod: NoticePeriod.DAYS_30,
    autoRenewal: true,
    integrations: [],
    contractHistory: [],
    documents: [],
    purchasedBySeat: false, // Example of non-seat based
  },
];

export const MOCK_AUDITS: Audit[] = [
  {
    id: 'audit-1',
    softwareId: 'sw-1',
    scheduledDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 10).toISOString(),
    completedDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 12).toISOString(),
    frequency: AuditFrequency.QUARTERLY,
    notes: 'All users active, utilization at 80%.',
    checklist: {
      verifyActiveUsers: true,
      checkSeatUtilization: true,
      reviewFeatureUsage: true,
      updateDepartmentAllocation: false,
    },
  },
];

export const MOCK_SOFTWARE_REQUESTS: SoftwareRequest[] = [
  {
    id: 'req-1',
    type: RequestType.SPECIFIC_SOFTWARE,
    requesterId: 'user-3',
    requestDate: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString(),
    status: RequestStatus.PENDING,
    businessJustification: 'Need a better tool for managing marketing campaigns.',
    softwareName: 'HubSpot',
    vendorName: 'HubSpot Inc.',
    estimatedCost: 1000,
    numUsersNeeded: 5,
  },
  {
    id: 'req-2',
    type: RequestType.GENERAL_NEED,
    requesterId: 'user-4',
    requestDate: new Date(new Date().getFullYear(), new Date().getMonth() -1, 20).toISOString(),
    status: RequestStatus.APPROVED,
    businessJustification: 'Current solution for document signing is cumbersome.',
    problemToSolve: 'Efficient electronic document signing.',
    currentPainPoints: 'Manual process, slow turnaround.',
    featureRequirements: 'Audit trails, mobile signing, templates.',
    budgetRange: '$50-100/month',
    timeline: 'Next quarter',
  },
];
