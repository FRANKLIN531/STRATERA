import { useState } from 'react';



import { Layout, Icons } from '@stratera/shared';



import type { User } from '@stratera/shared';



import { Dashboard } from '@hr/pages/Dashboard';

import { Employees } from '@hr/pages/Employees';

import { Salaries } from '@hr/pages/Salaries';

import { Attendance } from '@hr/pages/Attendance';

import { Leave } from '@hr/pages/Leave';

import { Departments } from '@hr/pages/Departments';

import { Reports } from '@hr/pages/Reports';

import { Messages } from '@hr/pages/Messages';

import { Settings } from '@hr/pages/Settings';

import { EmployeeProfile } from '@hr/pages/EmployeeProfile';

import { OrgChart } from '@hr/pages/OrgChart';



import { getHrApi } from '../api';

import { HrNavProvider } from '@hr/context/HrNavContext';
import { HrSettingsProvider } from '@hr/context/HrSettingsContext';
import { clearConfidentialAccess } from '@hr/context/ConfidentialAccessContext';
import { HrAppShell } from '@hr/components/HrAppShell';

import { NotificationBell } from '@hr/components/NotificationBell';

import { SessionTimeout } from '@hr/components/SessionTimeout';

import '@hr/styles/hr-dashboard.css';



const navItems = [

  { id: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard /> },

  { id: 'employees', label: 'Employees', icon: <Icons.Employees /> },

  { id: 'salaries', label: 'Salaries', icon: <Icons.Dollar /> },

  { id: 'attendance', label: 'Attendance', icon: <Icons.Attendance /> },

  { id: 'leave', label: 'Leave', icon: <Icons.Leave /> },

  { id: 'departments', label: 'Departments', icon: <Icons.Departments /> },

  { id: 'org-chart', label: 'Org Chart', icon: <Icons.Employees /> },

  { id: 'reports', label: 'Reports', icon: <Icons.Reports /> },

  { id: 'messages', label: 'Messages', icon: <Icons.Mail /> },

  { id: 'settings', label: 'Settings', icon: <Icons.Settings /> },

];



const pageTitles: Record<string, string> = {

  dashboard: 'HR Overview',

  employees: 'Employees',

  salaries: 'Salaries',

  attendance: 'Attendance',

  leave: 'Leave Management',

  departments: 'Departments & Positions',

  'org-chart': 'Organization Chart',

  reports: 'Reports',

  messages: 'Messages',

  settings: 'Settings',

  'employee-profile': 'Employee Profile',

};



const pages: Record<string, React.ComponentType> = {

  dashboard: Dashboard,

  employees: Employees,

  salaries: Salaries,

  attendance: Attendance,

  leave: Leave,

  departments: Departments,

  'org-chart': OrgChart,

  reports: Reports,

  messages: Messages,

  settings: Settings,

  'employee-profile': EmployeeProfile,

};



interface HrDesktopProps {

  user: User;

  onLogout: () => void;

}



export function HrDesktop({ user, onLogout }: HrDesktopProps) {
  const [activeNav, setActiveNav] = useState('dashboard');
  const api = getHrApi();

  const handleLogout = async () => {
    clearConfidentialAccess(user.id);
    await api.logout();
    onLogout();
  };

  return (
    <HrSettingsProvider>
    <HrNavProvider activeNav={activeNav} onNavChange={setActiveNav}>

      <SessionTimeout onLogout={handleLogout} />

      <Layout

        appName={pageTitles[activeNav] ?? 'HR'}

        appSubtitle="HUMAN RESOURCES"

        navItems={navItems}

        activeNav={activeNav}

        onNavChange={setActiveNav}

        userName={user.name}

        onLogout={handleLogout}

        headerExtra={<NotificationBell />}

      >

        <HrAppShell user={user} activeNav={activeNav} onNavChange={setActiveNav} pages={pages} />

      </Layout>

    </HrNavProvider>
    </HrSettingsProvider>
  );

}


