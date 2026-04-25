import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';
import { getSession } from '@/lib/sqhnSession';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['mentor'] },
  { id: 'standards', label: 'Standards', icon: FileText, path: '/standards', roles: ['trainee'] },
  { id: 'entrance', label: 'Entrance', icon: FileText, path: '/entrance', roles: ['trainee'] },
  { id: 'exit', label: 'Exit', icon: FileText, path: '/exit', roles: ['trainee'] },
  { id: 'plan', label: 'My Plan', icon: FileText, path: '/my-plan', roles: ['trainee'] },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', roles: ['mentor', 'trainee'] },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const [activeTab, setActiveTab] = useState(null);

  // Filter tabs based on user role
  const visibleTabs = TABS.filter(tab => session?.role && tab.roles.includes(session.role));

  // Determine which tab corresponds to current path
  useEffect(() => {
    const currentTab = visibleTabs.find(tab => location.pathname === tab.path);
    if (currentTab) {
      setActiveTab(currentTab.id);
      // Store this path for this tab
      sessionStorage.setItem(`tab-history-${currentTab.id}`, currentTab.path);
    }
  }, [location.pathname, visibleTabs]);

  const handleTabClick = (tab) => {
    // Get the last visited path for this tab, or use the default
    const lastPath = sessionStorage.getItem(`tab-history-${tab.id}`) || tab.path;
    setActiveTab(tab.id);
    navigate(lastPath);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}