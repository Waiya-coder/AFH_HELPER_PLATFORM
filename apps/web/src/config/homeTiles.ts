import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  ClipboardList,
  Clock,
  FolderOpen,
  GraduationCap,
  Heart,
  Users,
} from 'lucide-react';
import type { Role } from '@afh/shared';
import { EMPLOYER_ROLES } from '../lib/permissions';

export interface HomeTile {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tileClass: string;
  buttonClass: string;
  allowedRoles: Role[];
  href?: string;
  comingSoon?: boolean;
  /** Shown in the access-denied message (e.g. "employers and supervisors"). */
  accessLabel: string;
}

export const TODAY_TILES: HomeTile[] = [
  {
    id: 'staff-hours',
    title: 'Enter Staff Hours',
    description: 'Add or edit hours worked',
    icon: Clock,
    tileClass: 'bg-sky-600 text-white',
    buttonClass: 'bg-sky-500 hover:bg-sky-400',
    allowedRoles: ['staff', 'supervisor', 'admin'],
    href: '/my-shift',
    accessLabel: 'staff members',
  },
  {
    id: 'schedule',
    title: 'Make / View Schedule',
    description: 'Create or see staff schedule',
    icon: Calendar,
    tileClass: 'bg-emerald-600 text-white',
    buttonClass: 'bg-emerald-500 hover:bg-emerald-400',
    allowedRoles: ['staff', 'supervisor', 'admin'],
    href: '/schedule',
    accessLabel: 'staff, supervisors, and administrators',
  },
  {
    id: 'employees',
    title: 'My Employees',
    description: 'Add, edit or view employees',
    icon: Users,
    tileClass: 'bg-violet-600 text-white',
    buttonClass: 'bg-violet-500 hover:bg-violet-400',
    allowedRoles: EMPLOYER_ROLES,
    href: '/staff',
    accessLabel: 'employers and supervisors',
  },
  {
    id: 'clients',
    title: 'Clients',
    description: 'Client profiles and care plans',
    icon: Heart,
    tileClass: 'bg-rose-600 text-white',
    buttonClass: 'bg-rose-500 hover:bg-rose-400',
    allowedRoles: ['staff', 'supervisor', 'admin'],
    href: '/clients',
    accessLabel: 'assigned staff and supervisors',
  },
];

export const COMPLIANCE_TILES: HomeTile[] = [
  {
    id: 'audit-checklist',
    title: 'Audit Checklist',
    description: 'Readiness score, checklist, and audit packet',
    icon: ClipboardList,
    tileClass: 'bg-emerald-50 text-emerald-900 border-2 border-emerald-200',
    buttonClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
    allowedRoles: ['supervisor', 'admin', 'auditor'],
    href: '/audit-checklist',
    accessLabel: 'supervisors, administrators, and auditors',
  },
  {
    id: 'training',
    title: 'Training & Credentials',
    description: 'Track training and expiration dates',
    icon: GraduationCap,
    tileClass: 'bg-amber-50 text-amber-900 border-2 border-amber-200',
    buttonClass: 'bg-amber-500 text-white hover:bg-amber-600',
    allowedRoles: EMPLOYER_ROLES,
    href: '/training',
    accessLabel: 'employers and supervisors',
  },
  {
    id: 'records',
    title: 'Employee Hours',
    description: 'Hours worked by each staff member',
    icon: FolderOpen,
    tileClass: 'bg-sky-50 text-sky-900 border-2 border-sky-200',
    buttonClass: 'bg-sky-600 text-white hover:bg-sky-700',
    allowedRoles: ['staff', 'supervisor', 'admin', 'auditor'],
    href: '/timesheets',
    accessLabel: 'all team members',
  },
];
