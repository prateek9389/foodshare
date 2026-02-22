'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiUser, FiPhone, FiMapPin, FiHome, FiEdit, FiList, FiHeart, FiLogOut, FiMessageSquare, FiBarChart2, FiBriefcase, FiExternalLink, FiGlobe, FiUsers, FiCalendar, FiCheckCircle, FiPieChart } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Navbar from '../../components/Navbar';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  mobileNumber: string;
  city: string;
  state: string;
  address?: string;
  createdAt: { seconds: number; nanoseconds: number } | Date;
  updatedAt?: { seconds: number; nanoseconds: number } | Date;
  profileComplete: boolean;
  accountType?: 'individual' | 'business' | 'ngo';
  businessInfo?: {
    businessName: string;
    registrationNumber: string;
    businessType: string;
    website?: string;
    established?: { seconds: number; nanoseconds: number } | Date;
    employeeCount?: number;
    profileImage?: string;
    description?: string;
    galleryImages?: string[];
    paymentQR?: string;
  };
  ngoInfo?: {
    ngoName: string;
    registrationNumber: string;
    cause: string;
    website?: string;
    established?: { seconds: number; nanoseconds: number } | Date;
    reachCount?: number;
    profileImage?: string;
    description?: string;
    galleryImages?: string[];
    paymentQR?: string;
  };
}

// Helper function to format dates from various formats
const formatDate = (date: { seconds: number; nanoseconds: number } | Date | string | null | undefined) => {
  if (!date) return 'Unknown';
  
  // Handle Firestore timestamp objects
  if (date && typeof date === 'object' && 'seconds' in date) {
    return new Date((date as { seconds: number; nanoseconds: number }).seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // Handle Date objects
  if (date instanceof Date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // Handle string dates
  if (typeof date === 'string') {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return 'Unknown';
};

// Card animation variants for staggered animations
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: 'easeOut'
    }
  })
};

const ProfilePage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    savedListings: 0,
    unreadMessages: 0
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    const fetchUserProfile = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile({
            uid: user.uid,
            displayName: userData.displayName || user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL,
            mobileNumber: userData.mobileNumber || '',
            city: userData.city || '',
            state: userData.state || '',
            address: userData.address || '',
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
            profileComplete: userData.profileComplete || false,
            accountType: userData.accountType || 'individual',
            businessInfo: userData.businessInfo || undefined,
            ngoInfo: userData.ngoInfo || undefined
          });
        } else {
          // If user exists in auth but not in Firestore
          setUserProfile({
            uid: user.uid,
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL,
            mobileNumber: '',
            city: '',
            state: '',
            createdAt: new Date(),
            profileComplete: false,
            accountType: 'individual'
          });
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch user statistics
    const fetchUserStats = async () => {
      if (!user?.uid) return;
      
      try {
        // Fetch real data from Firestore
        // Get user's listings
        const listingsQuery = query(
          collection(db, 'foodListings'),
          where('userId', '==', user.uid)
        );
        const listingsSnapshot = await getDocs(listingsQuery);
        const totalListings = listingsSnapshot.size;
        
        // Get active listings
        const activeListingsQuery = query(
          collection(db, 'foodListings'),
          where('userId', '==', user.uid),
          where('isAvailable', '==', true)
        );
        const activeListingsSnapshot = await getDocs(activeListingsQuery);
        const activeListings = activeListingsSnapshot.size;
        
        // Get saved items
        const savedQuery = query(
          collection(db, 'wishlist'),
          where('userId', '==', user.uid)
        );
        const savedSnapshot = await getDocs(savedQuery);
        const savedListings = savedSnapshot.size;
        
        // Get unread messages
        const messagesQuery = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.uid),
          where('hasUnread', '==', true)
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        const unreadMessages = messagesSnapshot.size;
        
        setStats({
          totalListings,
          activeListings,
          savedListings,
          unreadMessages
        });
      } catch (err) {
        console.error('Error fetching user stats:', err);
      }
    };
    
    fetchUserProfile();
    fetchUserStats();
  }, [isAuthenticated, user, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Account type badge component
  const getAccountTypeBadgeClasses = (type: 'individual' | 'business' | 'ngo') => {
    const badgeColors = {
      individual: 'bg-gray-100 text-gray-800',
      business: 'bg-blue-100 text-blue-800',
      ngo: 'bg-purple-100 text-purple-800'
    };
    
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColors[type]}`;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </div>
      </>
    );
  }

  if (!userProfile) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
            <div className="text-center text-red-600">
              {error || 'Profile not found. Please try logging in again.'}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-8 sm:px-8 mb-4">
              <div className="flex flex-col sm:flex-row items-center">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-4 sm:mb-0 sm:mr-6">
                  {userProfile.photoURL ? (
                    <Image
                      src={userProfile.photoURL}
                      alt="Profile"
                      fill
                      className="rounded-full object-cover border-4 border-white"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-green-500 flex items-center justify-center border-4 border-white">
                      <FiUser className="text-white text-5xl" />
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 bg-white/90 px-3 py-1 rounded-md shadow-sm backdrop-blur-sm">
                    {userProfile.displayName || 'User'}
                  </h1>
                  <p className="text-gray-700 font-medium mt-2 bg-white/90 px-3 py-1 rounded-md shadow-sm backdrop-blur-sm">{userProfile.email}</p>
                  <motion.div 
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    className="flex flex-col sm:flex-row gap-2 mt-3"
                  >
                    {userProfile.accountType && userProfile.accountType !== 'individual' && (
                      <Link href="/dashboard">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 bg-white text-green-700 rounded-lg font-medium flex items-center justify-center mt-2 sm:mt-0 shadow-sm hover:shadow-md transition-all"
                        >
                          <FiBarChart2 className="mr-2" /> Dashboard
                        </motion.button>
                      </Link>
                    )}
                    <Link href="/profile/edit">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
                      >
                        <FiEdit className="mr-2" /> Edit Profile
                      </motion.button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
            
            {/* Profile Stats */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex flex-col md:flex-row items-center md:justify-between gap-4 mb-6">
                <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
                  
                 
                </div>
                <div className="p-6 sm:p-8 space-y-4 text-center flex-1 bg-gradient-to-r from-cyan-50 to-blue-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="text-2xl font-bold text-gray-800">{stats.activeListings}</div>
                  <div className="text-sm text-gray-500">Active Listings</div>
                </div>
              </div>
            </div>
            
            {/* Profile Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: 0.2 }} 
              className="bg-white overflow-hidden shadow-md rounded-xl border border-gray-100 hover:shadow-lg transition-shadow mb-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3 py-1 bg-blue-50 rounded-r-md">Business Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 mb-4">
                <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                  <FiPhone className="text-green-600 mt-1 mr-3 text-xl" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Mobile Number</p>
                    <p className="text-gray-900 font-medium">{userProfile.mobileNumber || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                  <FiMapPin className="text-green-600 mt-1 mr-3 text-xl" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">City</p>
                    <p className="text-gray-900 font-medium">{userProfile.city || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                  <FiHome className="text-green-600 mt-1 mr-3 text-xl" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">State</p>
                    <p className="text-gray-900 font-medium">{userProfile.state || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                  <FiCalendar className="text-green-600 mt-1 mr-3 text-xl" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Joined</p>
                    <p className="text-gray-900 font-medium">{userProfile.createdAt ? formatDate(userProfile.createdAt) : 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Business Information Section */}
            {userProfile.accountType === 'business' && userProfile.businessInfo && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center">
                    <FiBriefcase className="text-blue-500 mr-2" /> Business Information
                  </h2>
                </div>
                
                {userProfile.businessInfo.profileImage && (
                  <div className="mb-6">
                    <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                      <div className="relative w-full h-full">
                        <Image 
                          src={userProfile.businessInfo.profileImage} 
                          alt={userProfile.businessInfo.businessName} 
                          className="object-cover rounded-lg"
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                    <FiUser className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Business Name</p>
                      <p className="text-gray-800 font-medium">{userProfile.businessInfo.businessName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                    <FiCheckCircle className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Registration Number</p>
                      <p className="text-gray-900 font-medium">{userProfile.businessInfo.registrationNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                    <FiHome className="text-green-600 mt-1 mr-3 text-xl" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Business Type</p>
                      <p className="text-gray-900 font-medium">{userProfile.businessInfo.businessType}</p>
                    </div>
                  </div>
                  
                  {userProfile.businessInfo.established && (
                    <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                      <FiCalendar className="text-green-600 mt-1 mr-3 text-xl" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Established</p>
                        <p className="text-gray-900 font-medium">{formatDate(userProfile.businessInfo.established)}</p>
                      </div>
                    </div>
                  )}
                  
                  {userProfile.businessInfo.website && (
                    <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                      <FiGlobe className="text-gray-400 mt-1 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Website</p>
                        <a href={userProfile.businessInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                          {userProfile.businessInfo.website} <FiExternalLink className="ml-1 text-xs" />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {userProfile.businessInfo.employeeCount && (
                    <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                      <FiUsers className="text-gray-400 mt-1 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Employees</p>
                        <p className="text-gray-900 font-medium">{userProfile.businessInfo.employeeCount}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {userProfile.businessInfo.description && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">About</p>
                    <p className="text-gray-900 font-medium">{userProfile.businessInfo.description}</p>
                  </div>
                )}
                
                {userProfile.businessInfo.galleryImages && userProfile.businessInfo.galleryImages.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-600 mb-2">Gallery</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {userProfile.businessInfo.galleryImages.map((img, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <div className="relative w-full h-full">
                            <Image 
                              src={img} 
                              alt={`Gallery ${index + 1}`} 
                              className="object-cover"
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {userProfile.businessInfo.paymentQR && (
                  <div className="mt-6 flex flex-col items-center">
                    <p className="text-sm font-medium text-gray-600 mb-2">Payment QR Code</p>
                    <div className="w-40 h-40 bg-white p-2 border rounded-lg">
                      <div className="relative w-full h-full">
                        <Image 
                          src={userProfile.businessInfo.paymentQR} 
                          alt="Payment QR Code" 
                          className="object-contain"
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* NGO Information Section */}
            {userProfile.accountType === 'ngo' && userProfile.ngoInfo && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-4 border-purple-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center">
                    <FiHeart className="text-purple-500 mr-2" /> NGO Information
                  </h2>
                </div>
                
                {userProfile.ngoInfo.profileImage && (
                  <div className="mb-6">
                    <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                      <div className="relative w-full h-full">
                        <Image 
                          src={userProfile.ngoInfo.profileImage} 
                          alt={userProfile.ngoInfo.ngoName} 
                          className="object-cover rounded-lg"
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                    <FiUser className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">NGO Name</p>
                      <p className="text-gray-800 font-medium">{userProfile.ngoInfo.ngoName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                    <FiCheckCircle className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Registration Number</p>
                      <p className="text-gray-900 font-medium">{userProfile.ngoInfo.registrationNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                    <FiHeart className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Primary Cause</p>
                      <p className="text-gray-900 font-medium">{userProfile.ngoInfo.cause}</p>
                    </div>
                  </div>
                  
                  {userProfile.ngoInfo.established && (
                    <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                      <FiCalendar className="text-green-600 mt-1 mr-3 text-xl" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Established</p>
                        <p className="text-gray-900 font-medium">{formatDate(userProfile.ngoInfo.established)}</p>
                      </div>
                    </div>
                  )}
                  
                  {userProfile.ngoInfo.website && (
                    <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                      <FiGlobe className="text-gray-400 mt-1 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Website</p>
                        <a href={userProfile.ngoInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                          {userProfile.ngoInfo.website} <FiExternalLink className="ml-1 text-xs" />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {userProfile.ngoInfo.reachCount && (
                    <div className="flex items-start p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 shadow-sm hover:shadow-md">
                      <FiUsers className="text-gray-400 mt-1 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">People Impacted</p>
                        <p className="text-gray-900 font-medium">{typeof userProfile.ngoInfo.reachCount === 'number' ? userProfile.ngoInfo.reachCount.toLocaleString() : userProfile.ngoInfo.reachCount} annually</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {userProfile.ngoInfo.description && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">About</p>
                    <p className="text-gray-900 font-medium">{userProfile.ngoInfo.description}</p>
                  </div>
                )}
                
                {userProfile.ngoInfo.galleryImages && userProfile.ngoInfo.galleryImages.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-600 mb-2">Gallery</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {userProfile.ngoInfo.galleryImages.map((img, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <div className="relative w-full h-full">
                            <Image src={img} alt={`Gallery ${index + 1}`} className="object-cover" fill sizes="(max-width: 768px) 100vw, 150px" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {userProfile.ngoInfo.paymentQR && (
                  <div className="mt-6 flex flex-col items-center">
                    <p className="text-sm font-medium text-gray-600 mb-2">Donation QR Code</p>
                    <div className="w-40 h-40 bg-white p-2 border rounded-lg">
                      <div className="relative w-full h-full">
                        <Image src={userProfile.ngoInfo.paymentQR} alt="Donation QR Code" className="object-contain" fill sizes="(max-width: 768px) 100vw, 300px" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Account Actions */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-6 text-black sm:p-8 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-xl shadow-md border border-gray-100 mb-6 transform hover:scale-[1.01] transition-all hover:shadow-lg"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-l-4 border-teal-500 pl-3 py-2 bg-teal-50 rounded-r-md">Account Actions</h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 mt-4">
                <Link href="/my-listings" className="flex flex-col items-center p-4 bg-white rounded-lg hover:bg-gray-50 transition-all transform hover:-translate-y-1 hover:shadow-md border border-gray-100">
                  <FiList className="text-green-600 text-2xl mb-2" />
                  <span className="text-sm font-medium">My Listings</span>
                </Link>
                
                <Link href="/messages" className="flex flex-col items-center p-4 bg-white rounded-lg hover:bg-gray-50 transition-all transform hover:-translate-y-1 hover:shadow-md border border-gray-100 relative">
                  <FiMessageSquare className="text-green-600 text-2xl mb-2" />
                  <span className="text-sm font-medium">Messages</span>
                  {stats.unreadMessages > 0 && (
                    <motion.span 
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      {stats.unreadMessages}
                    </motion.span>
                  )}
                </Link>
                
                <Link href="/saved" className="flex flex-col items-center p-5 bg-white rounded-lg hover:bg-gray-50 transition-all transform hover:-translate-y-1 hover:shadow-md border border-gray-100">
                  <FiHeart className="text-green-600 text-2xl mb-2" />
                  <span className="text-sm font-medium">Saved Items</span>
                </Link>
                
                <Link href="/profile/edit" className="flex flex-col items-center p-4 bg-white rounded-lg hover:bg-gray-50 transition-all transform hover:-translate-y-1 hover:shadow-md border border-gray-100">
                  <FiEdit className="text-green-600 text-2xl mb-2" />
                  <span className="text-sm font-medium">Edit Profile</span>
                </Link>
                
                {(userProfile.accountType === 'business' || userProfile.accountType === 'ngo') && (
                  <Link href={`/dashboard`} className="flex flex-col items-center p-4 bg-gradient-to-b from-purple-50 to-indigo-50 rounded-lg hover:from-purple-100 hover:to-indigo-100 transition-all transform hover:-translate-y-1 hover:shadow-md border border-purple-100">
                    <FiPieChart className="text-purple-600 text-2xl mb-2" />
                    <span className="text-sm font-medium text-purple-600">Dashboard</span>
                  </Link>
                )}

                <button 
                  onClick={() => setUpgradeModalOpen(true)}
                  className="flex flex-col items-center p-4 bg-gradient-to-b from-indigo-50 to-blue-50 rounded-lg hover:from-indigo-100 hover:to-blue-100 transition-all transform hover:-translate-y-1 hover:shadow-md border border-indigo-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-sm font-medium text-indigo-600">Upgrade Account</span>
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="flex flex-col items-center p-4 bg-gradient-to-b from-red-50 to-pink-50 rounded-lg hover:from-red-100 hover:to-pink-100 transition-all transform hover:-translate-y-1 hover:shadow-md border border-red-100"
                >
                  <FiLogOut className="text-red-600 text-2xl mb-2" />
                  <span className="text-sm font-medium text-red-600">Logout</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Account Type Badge */}
      {userProfile && (
        <div className="fixed top-20 right-4 md:right-8">
          <div className={getAccountTypeBadgeClasses(userProfile.accountType as 'individual' | 'business' | 'ngo' || 'individual')}>
            {(userProfile.accountType || 'Individual').charAt(0).toUpperCase() + (userProfile.accountType || 'Individual').slice(1)}
          </div>
        </div>
      )}

      {/* Account Upgrade Modal */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upgrade Your Account</h3>
            <p className="text-gray-600 mb-6">Choose an account type that best suits your needs</p>
            
            <div className="space-y-3">
              <div className={`p-4 border rounded-lg cursor-pointer transition-all ${
                userProfile?.accountType === 'individual' ? 
                'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
              }`}>
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                    userProfile?.accountType === 'individual' ? 'border-green-500' : 'border-gray-300'
                  }`}>
                    {userProfile?.accountType === 'individual' && (
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Individual</h4>
                    <p className="text-xs text-gray-500">For personal food sharing</p>
                  </div>
                  {userProfile?.accountType === 'individual' && (
                    <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Current</span>
                  )}
                </div>
              </div>
              
              <Link href="/profile/upgrade/business" onClick={() => setUpgradeModalOpen(false)} className="block">
                <div className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  userProfile?.accountType === 'business' ? 
                  'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                      userProfile?.accountType === 'business' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {userProfile?.accountType === 'business' && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Business</h4>
                      <p className="text-xs text-gray-500">For restaurants, cafes and food businesses</p>
                    </div>
                    {userProfile?.accountType === 'business' && (
                      <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>
                    )}
                  </div>
                </div>
              </Link>
              
              <Link href="/profile/upgrade/ngo" onClick={() => setUpgradeModalOpen(false)} className="block">
                <div className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  userProfile?.accountType === 'ngo' ? 
                  'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                      userProfile?.accountType === 'ngo' ? 'border-purple-500' : 'border-gray-300'
                    }`}>
                      {userProfile?.accountType === 'ngo' && (
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">NGO</h4>
                      <p className="text-xs text-gray-500">For non-profit organizations fighting food waste</p>
                    </div>
                    {userProfile?.accountType === 'ngo' && (
                      <span className="ml-auto text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Current</span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setUpgradeModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default ProfilePage;
