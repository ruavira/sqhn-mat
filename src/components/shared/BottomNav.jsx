import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSession } from '@/lib/sqhnSession';
import { LayoutDashboard, ClipboardCheck, LogIn, LogOut, ClipboardList } from 'lucide-react';

const mentorTabs = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const traineeTabs = [
  { path: '/entrance', label: 'Entrance', icon: LogIn },
  { path: '/standards', label: 'Standards', icon: ClipboardCheck },
  { path: '/exit', label: 'Exit', icon: LogOut },
  { path: '/my-plan', label: 'My Plan', icon: ClipboardList },
];

export default function BottomNav() {
  const location = useLocation();
  const session = getSession();
  
  if (!session) return null;
  
  const tabs = session.role === 'mentor' ? mentorTabs : traineeTabs;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}