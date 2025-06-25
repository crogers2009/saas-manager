
import React from 'react';

export const APP_NAME = "SaaS Manager";

export const NAVIGATION_LINKS = [
  { path: "/", label: "Dashboard", icon: <DashboardIcon /> },
  { path: "/software", label: "Software Inventory", icon: <SoftwareIcon /> },
  { path: "/requests", label: "Software Requests", icon: <RequestIcon /> },
  { path: "/renewals", label: "Renewals", icon: <RenewalIcon /> },
  { path: "/audits", label: "Audits", icon: <AuditIcon /> },
  { path: "/overlap", label: "Feature Overlap", icon: <OverlapIcon /> },
  { path: "/email-settings", label: "Email Settings", icon: <EmailIcon /> },
];

// SVG Icons (simple examples)
export function DashboardIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

export function SoftwareIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function RequestIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

export function RenewalIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function AuditIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export function OverlapIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M3 10v4a2 2 0 002 2h10a2 2 0 002-2v-4M3 10V6a2 2 0 012-2h10a2 2 0 012 2v4M3 10h10a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2z" />
    </svg>
  );
}

export function PlusIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function EditIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

export function TrashIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export function ChevronDownIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function ChevronUpIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

export function ExternalLinkIcon(): React.ReactNode {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
    );
}

export function UploadIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

export function EmailIcon(): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export const DEFAULT_NOTICE_PERIODS = [
  { value: NoticePeriod.NONE, label: "None" },
  { value: NoticePeriod.DAYS_30, label: "30 Days" },
  { value: NoticePeriod.DAYS_60, label: "60 Days" },
  { value: NoticePeriod.DAYS_90, label: "90 Days" },
];

export const DEFAULT_PAYMENT_FREQUENCIES = [
  { value: PaymentFrequency.MONTHLY, label: "Monthly" },
  { value: PaymentFrequency.ANNUALLY, label: "Annually" },
  { value: PaymentFrequency.ONE_TIME, label: "One Time" },
];

export const DEFAULT_SOFTWARE_STATUSES = [
 { value: SoftwareStatus.ACTIVE, label: "Active" },
 { value: SoftwareStatus.INACTIVE, label: "Inactive" },
 { value: SoftwareStatus.PENDING_APPROVAL, label: "Pending Approval" },
];

export const DEFAULT_AUDIT_FREQUENCIES = [
  { value: AuditFrequency.NONE, label: "None" },
  { value: AuditFrequency.MONTHLY, label: "Monthly" },
  { value: AuditFrequency.QUARTERLY, label: "Quarterly" },
  { value: AuditFrequency.ANNUALLY, label: "Annually" },
];

export const DEFAULT_REQUEST_TYPES = [
  { value: RequestType.SPECIFIC_SOFTWARE, label: "Request Specific Software" },
  { value: RequestType.GENERAL_NEED, label: "Describe a General Need" },
];

export const DEFAULT_REQUEST_STATUSES = [
  { value: RequestStatus.PENDING, label: "Pending" },
  { value: RequestStatus.APPROVED, label: "Approved" },
  { value: RequestStatus.REJECTED, label: "Rejected" },
];

export const DEFAULT_DOCUMENT_TYPES = [
    { value: DocumentType.CONTRACT, label: "Contract" },
    { value: DocumentType.INVOICE, label: "Invoice" },
    { value: DocumentType.CORRESPONDENCE, label: "Correspondence" },
    { value: DocumentType.OTHER, label: "Other" },
];

export const DEFAULT_LICENSE_TYPES = [
    { value: LicenseType.PER_USER_SEAT, label: "Per User/Seat" },
    { value: LicenseType.SITE_LICENSE, label: "Site License" },
    { value: LicenseType.USAGE_BASED, label: "Usage-Based" },
    { value: LicenseType.PERPETUAL, label: "Perpetual" },
    { value: LicenseType.FREEMIUM, label: "Freemium" },
    { value: LicenseType.OTHER, label: "Other" },
];

import { AuditFrequency, DocumentType, LicenseType, NoticePeriod, PaymentFrequency, RequestStatus, RequestType, SoftwareStatus, UserRole } from './types';
