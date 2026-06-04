import type { SvgIconComponent } from '@mui/icons-material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import GradeIcon from '@mui/icons-material/Grade';
import GroupsIcon from '@mui/icons-material/Groups';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HistoryIcon from '@mui/icons-material/History';
import EmailIcon from '@mui/icons-material/Email';
import type { StaffUser } from '../api/http';

export type NavSectionId = 'overview' | 'programme' | 'teaching' | 'students' | 'administration';

export type NavItem = {
  label: string;
  path: string;
  icon: SvgIconComponent;
  roles: Array<StaffUser['role']>;
  section: NavSectionId;
};

const sectionLabels: Record<Exclude<NavSectionId, 'overview'>, string> = {
  programme: 'Session',
  teaching: 'Teaching',
  students: 'Students',
  administration: 'Administration',
};

/** Sidebar order: overview → setup → daily teaching → student records → staff accounts */
export const staffNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/staff', icon: DashboardIcon, roles: ['admin', 'teacher', 'assistant'], section: 'overview' },
  { label: 'Sessions', path: '/staff/sessions', icon: EventIcon, roles: ['admin', 'assistant'], section: 'programme' },
  { label: 'Register student', path: '/staff/registrations', icon: PersonAddIcon, roles: ['admin', 'assistant'], section: 'programme' },
  { label: 'Attendance', path: '/staff/attendance', icon: QrCodeScannerIcon, roles: ['admin', 'teacher', 'assistant'], section: 'teaching' },
  { label: 'My modules', path: '/staff/modules', icon: MenuBookIcon, roles: ['admin', 'teacher'], section: 'teaching' },
  { label: 'Enter scores', path: '/staff/scores', icon: GradeIcon, roles: ['admin', 'teacher', 'assistant'], section: 'teaching' },
  { label: 'Students', path: '/staff/students', icon: GroupsIcon, roles: ['admin', 'assistant'], section: 'students' },
  { label: 'Send email', path: '/staff/send-email', icon: EmailIcon, roles: ['admin'], section: 'administration' },
  { label: 'Staff users', path: '/staff/users', icon: PeopleIcon, roles: ['admin'], section: 'administration' },
  { label: 'Activity log', path: '/staff/audit-logs', icon: HistoryIcon, roles: ['admin'], section: 'administration' },
];

export function navItemsForRole(role: StaffUser['role']): NavItem[] {
  return staffNavItems.filter((item) => item.roles.includes(role));
}

export type NavSection = {
  id: NavSectionId;
  title: string | null;
  items: NavItem[];
};

export function navSectionsForRole(role: StaffUser['role']): NavSection[] {
  const items = navItemsForRole(role);
  const sections: NavSection[] = [];
  let currentId: NavSectionId | null = null;

  for (const item of items) {
    if (item.section !== currentId) {
      currentId = item.section;
      sections.push({
        id: item.section,
        title: item.section === 'overview' ? null : sectionLabels[item.section as Exclude<NavSectionId, 'overview'>],
        items: [],
      });
    }
    sections[sections.length - 1].items.push(item);
  }

  return sections;
}

/** Dashboard quick links: programme hierarchy (session → students → modules → daily tasks). */
const dashboardLinkOrder = [
  '/staff/sessions',
  '/staff/registrations',
  '/staff/students',
  '/staff/modules',
  '/staff/attendance',
  '/staff/scores',
  '/staff/send-email',
  '/staff/users',
  '/staff/audit-logs',
] as const;

export function dashboardQuickLinksForRole(role: StaffUser['role']): NavItem[] {
  const items = navItemsForRole(role).filter((item) => item.path !== '/staff');
  return [...items].sort(
    (a, b) =>
      dashboardLinkOrder.indexOf(a.path as (typeof dashboardLinkOrder)[number]) -
      dashboardLinkOrder.indexOf(b.path as (typeof dashboardLinkOrder)[number]),
  );
}
