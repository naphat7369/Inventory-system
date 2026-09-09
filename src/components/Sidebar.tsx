'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Settings, Tag, Building, Users, User, Key, Menu, X, Wrench, ArrowLeftRight, Boxes, FileText } from 'lucide-react';
import { logout, getExpiringRenewalsCount } from '@/app/actions';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/app/components/ThemeToggle';

export function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [expiringCount, setExpiringCount] = useState<number>(0);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      getExpiringRenewalsCount()
        .then((res) => {
          if (res && typeof res.totalAlerts === 'number') {
            setExpiringCount(res.totalAlerts);
          }
        })
        .catch(() => {});
    }
  }, [user, pathname]);

  let links = [];

  if (user?.role === 'ADMIN') {
    links = [
      { name: 'Dashboard', href: '/', icon: Home },
      { name: 'Assets', href: '/assets', icon: Package },
      { name: 'อุปกรณ์นับจำนวน (Stock)', href: '/quantity-assets', icon: Boxes },
      { name: 'ยืม-คืน (Borrows)', href: '/borrows', icon: ArrowLeftRight },
      { name: 'Licenses', href: '/licenses', icon: Key },
      { name: 'เอกสารต่ออายุ (Renewals)', href: '/renewals', icon: FileText, badge: expiringCount },
      { name: 'Categories', href: '/categories', icon: Tag },
      { name: 'Properties', href: '/properties', icon: Building },
      { name: 'Repair Center', href: '/repairs', icon: Wrench },
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Settings', href: '/settings', icon: Settings },
    ];
  } else {
    // Staff role strictly sees only Borrow Form
    links = [
      { name: 'ขอยืมอุปกรณ์ (Borrow Form)', href: '/borrows', icon: ArrowLeftRight },
    ];
  }


  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-gray-900 text-white p-4 w-full print:hidden z-30 relative shadow-sm">
        <div className="text-xl font-bold">Inventory System</div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button 
            onClick={() => setIsOpen(true)}
            aria-label="Open Menu"
            aria-expanded={isOpen}
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <div className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-gray-900 text-white min-h-screen print:hidden transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} dark:border-r dark:border-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.4)]`}>
        <div className="p-4 text-xl font-bold border-b border-gray-800 flex justify-between items-center">
          <span>Inventory System</span>
          <button 
            onClick={() => setIsOpen(false)}
            aria-label="Close Menu"
            className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/');
          
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="flex-1">{link.name}</span>
              {typeof link.badge === 'number' && link.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                  {link.badge}
                </span>
              )}
            </Link>

          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300">
              <User size={20} />
            </div>
            <div>
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <form action={logout}>
          <button type="submit" className="flex items-center space-x-3 p-3 w-full rounded-lg transition-colors text-red-400 hover:bg-gray-800 hover:text-red-300 font-medium">
            <span>Log Out</span>
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
