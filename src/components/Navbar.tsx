import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiUser, FiLogOut, FiHome, FiShoppingBag, FiPlus, FiMessageSquare, FiBookmark } from 'react-icons/fi';
import { MdOutlineFoodBank } from 'react-icons/md';
import Image from 'next/image';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: FiHome },
    { href: '/listings', label: 'Listings', icon: FiShoppingBag },
    { href: '/messages', label: 'Messages', icon: FiMessageSquare },
    { href: '/saved', label: 'Saved', icon: FiBookmark },
  ];

  return (
    <>
      <nav className={`bg-white sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'shadow-md py-2' : 'py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
          {/* Logo and brand */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
              <MdOutlineFoodBank className="text-white text-2xl" />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              FoodShare
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className={`${isActive ? 'text-green-600 font-medium' : 'text-gray-600'} hover:text-green-600 transition-colors flex items-center`}
                >
                  {React.createElement(link.icon, { className: 'mr-1', size: 18 })}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Auth buttons or profile */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/add-listing" 
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all flex items-center"
                >
                  <FiPlus className="mr-1" /> Add Listing
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                    {user?.photoURL ? (
                      <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-green-100 shadow-sm">
                        <Image 
                          src={user.photoURL} 
                          alt="Profile" 
                          fill
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 bg-gradient-to-r from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-sm ring-2 ring-green-50">
                        <FiUser className="text-green-600" />
                      </div>
                    )}
                  </button>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.displayName || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center">
                      <FiUser className="mr-2 text-gray-500" /> Profile
                    </Link>
                    <Link href="/my-listings" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center">
                      <FiShoppingBag className="mr-2 text-gray-500" /> My Listings
                    </Link>
                    <Link href="/messages" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center">
                      <FiMessageSquare className="mr-2 text-gray-500" /> Messages
                    </Link>
                    <button 
                      onClick={logout} 
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center text-sm"
                    >
                      <FiLogOut className="mr-2 text-gray-500" /> Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-gray-700 hover:text-green-600 transition-colors font-medium">
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMenu} 
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black z-40 md:hidden"
              onClick={toggleMenu}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 w-72 h-full bg-white z-50 shadow-xl md:hidden overflow-y-auto"
            >
              <div className="p-5 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                    <MdOutlineFoodBank className="text-white text-xl" />
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                    FoodShare
                  </span>
                </div>
                <button onClick={toggleMenu} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                  <FiX size={20} />
                </button>
              </div>
              
              <div className="py-4 px-5">
                {isAuthenticated && (
                  <div className="flex items-center space-x-3 mb-6 p-3 bg-gray-50 rounded-xl">
                    {user?.photoURL ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white">
                        <Image 
                          src={user.photoURL} 
                          alt="Profile" 
                          fill
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-sm">
                        <FiUser className="text-green-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-1">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link 
                        key={link.href} 
                        href={link.href} 
                        className={`flex items-center p-3 rounded-lg ${isActive ? 'bg-green-50 text-green-600' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {React.createElement(link.icon, { className: 'mr-3', size: 18 })}
                        {link.label}
                      </Link>
                    );
                  })}
                  
                  {isAuthenticated ? (
                    <>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <Link 
                          href="/add-listing" 
                          className="flex items-center justify-center p-3 mt-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium"
                        >
                          <FiPlus className="mr-2" /> Add New Listing
                        </Link>
                        
                        <Link href="/profile" className="flex items-center p-3 text-gray-700 hover:bg-gray-50 rounded-lg mt-2">
                          <FiUser className="mr-3 text-gray-500" /> Profile
                        </Link>
                        
                        <Link href="/my-listings" className="flex items-center p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                          <FiShoppingBag className="mr-3 text-gray-500" /> My Listings
                        </Link>
                        
                        <button 
                          onClick={logout} 
                          className="flex items-center w-full p-3 text-gray-700 hover:bg-gray-50 rounded-lg text-left"
                        >
                          <FiLogOut className="mr-3 text-gray-500" /> Logout
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <Link 
                        href="/login" 
                        className="flex items-center justify-center p-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium"
                      >
                        Login
                      </Link>
                      <Link 
                        href="/signup" 
                        className="flex items-center justify-center p-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
