import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logoutMutation } = useAuth();
  const [location] = useLocation();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <h1 className="text-lg font-bold text-primary">ZoomManager</h1>
        </div>
        <button onClick={toggleMenu} className="text-neutral-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>
      <div className={cn("bg-white shadow-md absolute w-full", !menuOpen && "hidden")}>
        <nav className="py-2">
          <ul>
            <li>
              <Link href="/">
                <a 
                  className={cn(
                    "block px-4 py-2 hover:bg-neutral-100",
                    isActive("/") && "bg-neutral-100 text-primary"
                  )}
                  onClick={closeMenu}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <a 
                  className={cn(
                    "block px-4 py-2 hover:bg-neutral-100",
                    isActive("/request") && "bg-neutral-100 text-primary"
                  )}
                  onClick={closeMenu}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  Minta Akun Zoom
                </a>
              </Link>
            </li>
            <li>
              <Link href="/bookings">
                <a 
                  className={cn(
                    "block px-4 py-2 hover:bg-neutral-100",
                    isActive("/bookings") && "bg-neutral-100 text-primary"
                  )}
                  onClick={closeMenu}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Pemesanan Saya
                </a>
              </Link>
            </li>
            <li>
              <button 
                className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-500"
                onClick={() => {
                  closeMenu();
                  logoutMutation.mutate();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Keluar
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
