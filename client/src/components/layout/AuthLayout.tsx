import React from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/">
                  <a className="text-primary-700 font-bold text-xl">
                    Property Management System
                  </a>
                </Link>
              </div>
              
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/">
                  <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Dashboard
                  </a>
                </Link>
                
                <Link href="/properties">
                  <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Properties
                  </a>
                </Link>
                
                <Link href="/guests">
                  <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Guests
                  </a>
                </Link>
                
                <Link href="/cleaning">
                  <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Cleaning
                  </a>
                </Link>
                
                <Link href="/maintenance">
                  <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Maintenance
                  </a>
                </Link>
                
                {user && user.role === 'admin' && (
                  <Link href="/admin">
                    <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                      Admin
                    </a>
                  </Link>
                )}
              </nav>
            </div>
            
            {/* User menu */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="relative inline-block">
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                    {user?.name.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-green-400 ring-2 ring-white"></span>
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                <p className="text-xs font-medium text-gray-500">{user?.role || 'Guest'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}