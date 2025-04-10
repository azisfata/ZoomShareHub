import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <aside className="hidden md:block fixed w-64 h-full bg-white shadow-md">
      <div className="p-6">
        <div className="flex items-center mb-8">
          <h1 className="text-xl font-bold text-primary">ZoomManager</h1>
        </div>
        
        {user && (
          <div className="mb-8">
            <div className="py-3 px-4 bg-neutral-100 rounded-lg">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-500">{user.department}</p>
            </div>
          </div>
        )}
        
        <nav>
          <ul className="space-y-2">
            <li>
              <Link href="/">
                <a className={cn(
                  "flex items-center py-2 px-4 rounded-md hover:bg-neutral-100 font-medium",
                  isActive("/") && "bg-neutral-100 text-primary"
                )}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  Dasbor
                </a>
              </Link>
            </li>
            <li>
              <Link href="/request">
                <a className={cn(
                  "flex items-center py-2 px-4 rounded-md hover:bg-neutral-100 font-medium",
                  isActive("/request") && "bg-neutral-100 text-primary"
                )}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  Minta Akun Zoom
                </a>
              </Link>
            </li>
            
            {user?.role === 'admin' && (
              <li>
                <Link href="/admin">
                  <a className={cn(
                    "flex items-center py-2 px-4 rounded-md hover:bg-neutral-100 font-medium",
                    isActive("/admin") && "bg-neutral-100 text-primary"
                  )}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Portal Admin
                  </a>
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
      
      <div className="absolute bottom-0 w-full p-6">
        <button 
          onClick={() => logoutMutation.mutate()}
          className="flex items-center py-2 px-4 rounded-md hover:bg-red-50 font-medium text-red-500 w-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Keluar
        </button>
      </div>
    </aside>
  );
}
