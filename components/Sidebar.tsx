import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NAVIGATION_LINKS, APP_NAME } from '../constants';

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const Sidebar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 bg-brand-blue text-white flex flex-col min-h-screen fixed">
      <div className="h-16 flex items-center justify-center px-4 shadow-md">
        <img src="/logo.png" alt="First Acceptance Logo" className="h-8 mr-2" />
        <h1 className="text-xl font-semibold">{APP_NAME}</h1>
      </div>
      
      <nav className="flex-grow mt-5 px-2 space-y-1">
        {NAVIGATION_LINKS.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                isActive
                  ? 'bg-brand-blue-light text-white'
                  : 'text-blue-100 hover:bg-brand-blue-light hover:text-white'
              }`
            }
          >
            {link.icon && <span className="mr-3 h-5 w-5">{link.icon}</span>}
            {link.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand-blue-light text-white'
                    : 'text-blue-100 hover:bg-brand-blue-light hover:text-white'
                }`
              }
            >
              <span className="mr-3 h-5 w-5"><UsersIcon /></span>
              User Management
            </NavLink>
            <NavLink
              to="/departments"
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand-blue-light text-white'
                    : 'text-blue-100 hover:bg-brand-blue-light hover:text-white'
                }`
              }
            >
              <span className="mr-3 h-5 w-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              Department Management
            </NavLink>
          </>
        )}
      </nav>
      
      <div className="p-4 border-t border-blue-700">
        <div className="mb-3">
          <p className="text-sm text-blue-100 mb-1">Logged in as:</p>
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-blue-200">{user?.role}</p>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-blue-100 hover:bg-brand-blue-light hover:text-white transition-colors duration-150"
        >
          <span className="mr-3 h-5 w-5"><LogoutIcon /></span>
          Logout
        </button>
        
        <p className="text-xs text-blue-200 mt-3">&copy; {new Date().getFullYear()} First Acceptance</p>
      </div>
    </div>
  );
};

export default Sidebar;