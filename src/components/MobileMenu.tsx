'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  FiHome, 
  FiPlusCircle, 
  FiBookmark, 
  FiMessageSquare,
  FiShoppingBag
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const MobileMenu = () => {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  // We use this state to show labels on hover in larger screens
  const [, setShowLabel] = useState<string | null>(null);

  const menuItems = [
    { icon: FiHome, label: 'Home', path: '/' },
    { icon: FiShoppingBag, label: 'Listings', path: '/listings' },
    { icon: FiPlusCircle, label: 'Add', path: '/add-listing' },
    { icon: FiMessageSquare, label: 'Messages', path: '/messages' },
    { icon: FiBookmark, label: 'Saved', path: '/saved' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <motion.div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg md:hidden z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      <div className="flex justify-around px-4 py-3">
        {menuItems.map((item, index) => {
          const active = isActive(item.path);
          return (
            <Link 
              href={isAuthenticated || item.path === '/' || item.path === '/listings' ? item.path : '/login'} 
              key={index}
              className="relative w-16"
              onMouseEnter={() => setShowLabel(item.label)}
              onMouseLeave={() => setShowLabel(null)}
              onClick={() => setShowLabel(null)}
            >
              <motion.div
                className="flex flex-col items-center justify-center"
                whileTap={{ scale: 0.9 }}
              >
                {item.path === '/add-listing' ? (
                  <div className="bg-gradient-to-r from-green-500 to-green-600 w-12 h-12 rounded-full flex items-center justify-center shadow-md mb-1 -mt-6">
                    <FiPlusCircle size={24} className="text-white" />
                  </div>
                ) : (
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full ${active ? 'bg-green-50' : 'bg-transparent'}`}>
                    {React.createElement(item.icon, { 
                      size: 22, 
                      className: active ? 'text-green-600' : 'text-gray-500'
                    })}
                  </div>
                )}
                
                <motion.span 
                  className={`text-xs mt-1 font-medium ${active ? 'text-green-600' : 'text-gray-500'}`}
                >
                  {item.label}
                </motion.span>
              </motion.div>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-bottom bg-white"></div>
    </motion.div>
  );
};

export default MobileMenu;
