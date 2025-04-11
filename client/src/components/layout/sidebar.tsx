import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { LogOut, Home, CalendarDays, PlusCircle, Settings, User } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={`hidden md:block fixed h-full bg-white shadow-md transition-all duration-300 z-10 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="p-6">
        <div className={`flex items-center mb-8 ${isCollapsed ? 'justify-center' : ''}`}>
          {isCollapsed ? (
            <Settings className="h-6 w-6" />
          ) : (
            <h1 className="text-xl font-bold text-primary">ZoomManager</h1>
          )}
        </div>

        {user && (
          <div className="mb-8">
            <div className={`py-3 ${isCollapsed ? 'px-2' : 'px-4'} bg-neutral-100 rounded-lg flex items-center justify-center`}>
              {isCollapsed ? (
                <User className="h-5 w-5" />
              ) : (
                <div>
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.department}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <nav>
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard">
                <a className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-2 rounded-lg hover:bg-neutral-100 ${isActive('/dashboard') ? 'bg-neutral-100' : ''}`}>
                  <Home className="h-5 w-5" />
                  {!isCollapsed && <span className="ml-3">Dashboard</span>}
                </a>
              </Link>
            </li>
            <li>
              <Link href="/my-bookings">
                <a className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-2 rounded-lg hover:bg-neutral-100 ${isActive('/my-bookings') ? 'bg-neutral-100' : ''}`}>
                  <CalendarDays className="h-5 w-5" />
                  {!isCollapsed && <span className="ml-3">Pemesanan Saya</span>}
                </a>
              </Link>
            </li>
            <li>
              <Link href="/request-form">
                <a className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-2 rounded-lg hover:bg-neutral-100 ${isActive('/request-form') ? 'bg-neutral-100' : ''}`}>
                  <PlusCircle className="h-5 w-5" />
                  {!isCollapsed && <span className="ml-3">Permintaan Akun</span>}
                </a>
              </Link>
            </li>
          </ul>
        </nav>

        <div className={`absolute bottom-6 ${isCollapsed ? 'w-16' : 'w-64'} ${isCollapsed ? 'px-2' : 'px-6'}`}>
          <Button
            variant="ghost"
            className={`w-full ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}