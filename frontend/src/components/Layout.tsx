import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Radio, FileText, Settings, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const publicNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reports', icon: FileText, label: 'Reports' },
];

const adminNavItems = [
  { to: '/sources', icon: Radio, label: 'Sources' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { isAdmin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const navItems = isAdmin ? [...publicNavItems, ...adminNavItems] : publicNavItems;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background text-gray-900 dark:text-gray-100 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-surface border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Loom
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {isAdmin && (
          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        )}

        {!isAdmin && (
          <div className="absolute bottom-4 left-4 right-4">
            <NavLink
              to="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <span className="font-medium">Admin Login</span>
            </NavLink>
          </div>
        )}
      </aside>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-surface/50 backdrop-blur sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          {isAdmin && (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded mr-2">
              Admin
            </span>
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
