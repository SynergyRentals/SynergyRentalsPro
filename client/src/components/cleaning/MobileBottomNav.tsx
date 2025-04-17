import React from 'react';
import { Home, ListCheck, Map, Camera, CalendarClock } from 'lucide-react';
import { useLocation, Link } from 'wouter';

type BottomNavItem = {
  icon: React.ReactNode;
  label: string;
  href: string;
};

export default function MobileBottomNav() {
  const [location] = useLocation();

  const navItems: BottomNavItem[] = [
    {
      icon: <Home className="h-5 w-5" />,
      label: 'Home',
      href: '/',
    },
    {
      icon: <ListCheck className="h-5 w-5" />,
      label: 'Tasks',
      href: '/mobile-cleaning',
    },
    {
      icon: <Map className="h-5 w-5" />,
      label: 'Map',
      href: '/mobile-cleaning?tab=route',
    },
    {
      icon: <Camera className="h-5 w-5" />,
      label: 'Photos',
      href: '/mobile-cleaning?tab=photos',
    },
    {
      icon: <CalendarClock className="h-5 w-5" />,
      label: 'Schedule',
      href: '/mobile-cleaning?tab=schedule',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 z-50 flex justify-around items-center px-2">
      {navItems.map((item, index) => {
        const isActive = 
          (item.href === '/' && location === '/') || 
          (item.href !== '/' && location.startsWith(item.href.split('?')[0]));

        return (
          <Link key={index} href={item.href}>
            <a className={`flex flex-col items-center justify-center w-full py-1 ${
              isActive ? 'text-primary' : 'text-gray-500'
            }`}>
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        );
      })}
    </div>
  );
}