'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Settings, Tag, MapPin, LayoutDashboard, Building, Users, LogOut, User, Key } from 'lucide-react';
import { logout } from '@/app/actions';

export function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Assets', href: '/assets', icon: Package },
    { name: 'Licenses', href: '/licenses', icon: Key },
    { name: 'Categories', href: '/categories', icon: Tag },
    { name: 'Properties', href: '/properties', icon: Building },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (user?.role === 'ADMIN') {
    links.push({ name: 'Users', href: '/users', icon: Users });
  }

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white min-h-screen print:hidden">
      <div className="p-4 text-xl font-bold border-b border-gray-800">
        Inventory System
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/');
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300">
            <User size={20} />
          </div>
          <div>
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
        </div>
        <form action={logout}>
          <button type="submit" className="flex items-center space-x-3 p-3 w-full rounded-lg transition-colors text-red-400 hover:bg-gray-800 hover:text-red-300 font-medium">
            <span>Log Out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
