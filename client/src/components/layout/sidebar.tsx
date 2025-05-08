import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { LogOut, Home, CalendarDays, PlusCircle, Settings, User } from 'lucide-react';
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";

interface SidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed: _isCollapsed, setIsCollapsed: _setIsCollapsed }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { isCollapsed, setIsCollapsed } = useSidebarCollapse();

  const isActive = (path: string) => {
    return location === path;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={`hidden md:block fixed h-full bg-white shadow-md transition-all duration-300 z-10 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <button 
        onClick={toggleSidebar}
        className="absolute right-2 top-6 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
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
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-primary">ZoomManager</h1>
          )}
        </div>

        {user && (
          <div className="mb-8">
            <div className={`py-3 ${isCollapsed ? 'px-1' : 'px-4'} bg-neutral-100 rounded-lg flex items-center justify-center`}>
              {isCollapsed ? (
                <User className="h-7 w-7" />
              ) : (
                <div>
                  <p className="text-sm font-medium whitespace-normal break-words leading-tight max-w-xs md:max-w-md">{user.name}</p>
                  <p className="text-xs text-gray-500 whitespace-normal break-words leading-tight max-w-xs md:max-w-md">{user.department}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <nav>
          <ul className="space-y-2">
            <li>
              <Link href="/">
                <span className={`flex items-center ${isCollapsed ? 'justify-center' : ''} ${isCollapsed ? 'px-0' : 'px-4'} py-2 rounded-lg hover:bg-neutral-100 ${isActive('/') ? 'bg-neutral-100' : ''}`}
                  role="link"
                  tabIndex={0}
                  onClick={undefined}
                >
                  <Home className="h-5 w-5 text-gray-500" />
                  {!isCollapsed && <span className="ml-3">Dashboard</span>}
                </span>
              </Link>
            </li>
            <li>
              <Link href="/my-bookings">
                <span className={`flex items-center ${isCollapsed ? 'justify-center' : ''} ${isCollapsed ? 'px-0' : 'px-4'} py-2 rounded-lg hover:bg-neutral-100 ${isActive('/my-bookings') ? 'bg-neutral-100' : ''}`}
                  role="link"
                  tabIndex={0}
                  onClick={undefined}
                >
                  <CalendarDays className="h-5 w-5 text-gray-500" />
                  {!isCollapsed && <span className="ml-3">Riwayat Pemesanan</span>}
                </span>
              </Link>
            </li>
            <li>
              <Link href="/request">
                <span className={`flex items-center ${isCollapsed ? 'justify-center' : ''} ${isCollapsed ? 'px-0' : 'px-4'} py-2 rounded-lg hover:bg-neutral-100 ${isActive('/request') ? 'bg-neutral-100' : ''}`}
                  role="link"
                  tabIndex={0}
                  onClick={undefined}
                >
                  <PlusCircle className="h-5 w-5 text-gray-500" />
                  {!isCollapsed && <span className="ml-3">Permintaan Akun</span>}
                </span>
              </Link>
            </li>
            {user?.role === 'admin' && (
              <li>
                <Link href="/admin">
                  <span className={`flex items-center ${isCollapsed ? 'justify-center' : ''} ${isCollapsed ? 'px-0' : 'px-4'} py-2 rounded-lg hover:bg-neutral-100 ${isActive('/admin') ? 'bg-neutral-100' : ''}`}
                    role="link"
                    tabIndex={0}
                    onClick={undefined}
                  >
                    <Settings className="h-5 w-5 text-gray-500" />
                    {!isCollapsed && <span className="ml-3">Admin</span>}
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className={`absolute bottom-6 ${isCollapsed ? 'w-20' : 'w-64'} ${isCollapsed ? 'px-1' : 'px-6'}`}>
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
