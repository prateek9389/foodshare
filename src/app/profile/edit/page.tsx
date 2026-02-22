'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiUser, FiPhone, FiMapPin, FiHome, FiArrowLeft, FiCheck, FiAlertTriangle, FiGlobe, FiCalendar, FiUsers, FiBriefcase, FiFileText, FiHeart } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Navbar from '../../../components/Navbar';

// Business types
const BUSINESS_TYPES = [
  'Restaurant',
  'Food Store',
  'Supermarket',
  'Bakery',
  'Catering Service',
  'Cloud Kitchen',
  'Food Processing Unit',
  'Wholesaler',
  'Distributor',
  'Grocery Shop',
  'Other'
];

// NGO Cause Areas
const NGO_CAUSES = [
  'Food Security',
  'Food Rescue',
  'Food Redistribution',
  'Community Welfare',
  'Hunger Relief',
  'Poverty Alleviation',
  'Environmental Sustainability',
  'Waste Reduction',
  'Children & Youth',
  'Healthcare',
  'Other'
];

// Indian states list
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const ProfileEditPage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
    const [formData, setFormData] = useState({
    // Basic info
    displayName: '',
    mobileNumber: '',
    state: '',
    city: '',
    address: '',
    // Business info
    businessInfo: {
      businessName: '',
      businessType: '',
      registrationNumber: '',
      website: '',
      established: '',
      description: ''
    },
    // NGO info
    ngoInfo: {
      ngoName: '',
      registrationNumber: '',
      cause: '',
      website: '',
      established: '',
      reachCount: '',
      description: ''
    }
  });
  
  // Account type and image states
  const [accountType, setAccountType] = useState<'personal' | 'business' | 'ngo'>('personal');
  const [businessProfileImage, setBusinessProfileImage] = useState<string | null>(null);
  const [businessGalleryImages, setBusinessGalleryImages] = useState<string[]>([]);
  const [businessPaymentQR, setBusinessPaymentQR] = useState<string | null>(null);
  const [ngoProfileImage, setNgoProfileImage] = useState<string | null>(null);
  const [ngoGalleryImages, setNgoGalleryImages] = useState<string[]>([]);
  const [ngoPaymentQR, setNgoPaymentQR] = useState<string | null>(null);
  
  // Active tab for business/NGO editing
  const [activeTab, setActiveTab] = useState('basic');

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
                    setAccountType(userData.accountType || 'personal');
          
          const basicInfo = {
            displayName: userData.displayName || user.displayName || '',
            mobileNumber: userData.mobileNumber || '',
            state: userData.state || '',
            city: userData.city || '',
            address: userData.address || ''
          };
          
          // Load business info if available
          let businessInfo = {
            businessName: '',
            businessType: '',
            registrationNumber: '',
            website: '',
            established: '',
            description: ''
          };
          
          if (userData.accountType === 'business' && userData.businessInfo) {
            businessInfo = {
              businessName: userData.businessInfo.businessName || '',
              businessType: userData.businessInfo.businessType || '',
              registrationNumber: userData.businessInfo.registrationNumber || '',
              website: userData.businessInfo.website || '',
              established: userData.businessInfo.established ? 
                new Date(userData.businessInfo.established.seconds * 1000).toISOString().split('T')[0] : '',
              description: userData.businessInfo.description || ''
            };
            
            if (userData.businessInfo.profileImage) {
              setBusinessProfileImage(userData.businessInfo.profileImage);
            }
            
            if (userData.businessInfo.galleryImages && userData.businessInfo.galleryImages.length > 0) {
              setBusinessGalleryImages(userData.businessInfo.galleryImages);
            }
            
            if (userData.businessInfo.paymentQR) {
              setBusinessPaymentQR(userData.businessInfo.paymentQR);
            }
          }
          
          // Load NGO info if available
          let ngoInfo = {
            ngoName: '',
            registrationNumber: '',
            cause: '',
            website: '',
            established: '',
            reachCount: '',
            description: ''
          };
          
          if (userData.accountType === 'ngo' && userData.ngoInfo) {
            ngoInfo = {
              ngoName: userData.ngoInfo.ngoName || '',
              registrationNumber: userData.ngoInfo.registrationNumber || '',
              cause: userData.ngoInfo.cause || '',
              website: userData.ngoInfo.website || '',
              established: userData.ngoInfo.established ? 
                new Date(userData.ngoInfo.established.seconds * 1000).toISOString().split('T')[0] : '',
              reachCount: userData.ngoInfo.reachCount?.toString() || '',
              description: userData.ngoInfo.description || ''
            };
            
            if (userData.ngoInfo.profileImage) {
              setNgoProfileImage(userData.ngoInfo.profileImage);
            }
            
            if (userData.ngoInfo.galleryImages && userData.ngoInfo.galleryImages.length > 0) {
              setNgoGalleryImages(userData.ngoInfo.galleryImages);
            }
            
            if (userData.ngoInfo.paymentQR) {
              setNgoPaymentQR(userData.ngoInfo.paymentQR);
            }
          }
          
          setFormData({
            ...basicInfo,
            businessInfo,
            ngoInfo
          });
        } else {
          // If user exists in auth but not in Firestore
          setFormData({
            displayName: user.displayName || '',
            mobileNumber: '',
            state: '',
            city: '',
            address: '',
            businessInfo: {
              businessName: '',
              businessType: '',
              registrationNumber: '',
              website: '',
              established: '',
              description: ''
            },
            ngoInfo: {
              ngoName: '',
              registrationNumber: '',
              cause: '',
              website: '',
              established: '',
              reachCount: '',
              description: ''
            }
          });
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [isAuthenticated, user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      // Validations
      if (!formData.displayName || !formData.mobileNumber || !formData.state || !formData.city) {
        throw new Error('Please fill in all required fields');
      }
      
      // Validate mobile number (10 digits)
      if (!/^\d{10}$/.test(formData.mobileNumber)) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }
      
            // Prepare the update data
      const updateData: {
        displayName: string;
        mobileNumber: string;
        state: string;
        city: string;
        address: string;
        profileComplete: boolean;
        updatedAt?: Date;
        businessInfo?: {
          businessName: string;
          description: string;
          registrationNumber: string;
          businessType: string;
          established?: { seconds: number; nanoseconds: number } | Date;
          website?: string;
          address?: string;
          city?: string;
          reachCount?: number;
          profileImage?: string;
          galleryImages?: string[];
          paymentQR?: string;
        };
        ngoInfo?: {
          ngoName: string;
          description: string;
          registrationNumber: string;
          cause: string;
          established?: { seconds: number; nanoseconds: number } | Date;
          website?: string;
          address?: string;
          city?: string;
          reachCount?: number;
          profileImage?: string;
          galleryImages?: string[];
          paymentQR?: string;
        };
      } = {
        displayName: formData.displayName,
        mobileNumber: formData.mobileNumber,
        state: formData.state,
        city: formData.city,
        address: formData.address,
        profileComplete: true,
        updatedAt: new Date()
      };
      
      // Add business info if user is a business
      if (accountType === 'business') {
        // Parse established date
        const establishedDate = formData.businessInfo.established 
          ? new Date(formData.businessInfo.established) 
          : undefined;
          
        updateData.businessInfo = {
          businessName: formData.businessInfo.businessName,
          businessType: formData.businessInfo.businessType,
          registrationNumber: formData.businessInfo.registrationNumber,
          website: formData.businessInfo.website || undefined,
          established: establishedDate,
          description: formData.businessInfo.description || '',
          profileImage: businessProfileImage || undefined,
          galleryImages: businessGalleryImages || [],
          paymentQR: businessPaymentQR || undefined
        };
      }
      
      // Add NGO info if user is an NGO
      if (accountType === 'ngo') {
        // Parse established date and reach count
        const establishedDate = formData.ngoInfo.established 
          ? new Date(formData.ngoInfo.established) 
          : undefined;
          
        updateData.ngoInfo = {
          ngoName: formData.ngoInfo.ngoName,
          registrationNumber: formData.ngoInfo.registrationNumber,
          cause: formData.ngoInfo.cause,
          website: formData.ngoInfo.website || undefined,
          established: establishedDate,
          reachCount: formData.ngoInfo.reachCount ? parseInt(formData.ngoInfo.reachCount) : undefined,
          description: formData.ngoInfo.description || '',
          profileImage: ngoProfileImage || undefined,
          galleryImages: ngoGalleryImages || [],
          paymentQR: ngoPaymentQR || undefined
        };
      }
      
      // Update user profile in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, updateData);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link 
              href="/profile" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-green-600"
            >
              <FiArrowLeft className="mr-2" /> Back to Profile
            </Link>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-md p-8"
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>
            
            {/* Tab Navigation for different account types */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`pb-4 px-1 ${activeTab === 'basic' ? 
                    'border-b-2 border-green-500 text-green-600 font-medium' : 
                    'border-b-2 border-transparent text-gray-500 hover:border-gray-300'}`}
                >
                  Basic Information
                </button>
                
                {accountType === 'business' && (
                  <button
                    onClick={() => setActiveTab('business')}
                    className={`pb-4 px-1 ${activeTab === 'business' ? 
                      'border-b-2 border-green-500 text-green-600 font-medium' : 
                      'border-b-2 border-transparent text-gray-500 hover:border-gray-300'}`}
                  >
                    Business Details
                  </button>
                )}
                
                {accountType === 'ngo' && (
                  <button
                    onClick={() => setActiveTab('ngo')}
                    className={`pb-4 px-1 ${activeTab === 'ngo' ? 
                      'border-b-2 border-green-500 text-green-600 font-medium' : 
                      'border-b-2 border-transparent text-gray-500 hover:border-gray-300'}`}
                  >
                    NGO Details
                  </button>
                )}
              </nav>
            </div>
            
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <div className="flex">
                  <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <div className="flex">
                  <FiCheck className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-sm text-green-700">Profile updated successfully!</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name*
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="displayName"
                        name="displayName"
                        type="text"
                        value={formData.displayName}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number*
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="mobileNumber"
                        name="mobileNumber"
                        type="tel"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        required
                        pattern="[0-9]{10}"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        placeholder="10-digit mobile number"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">This will be shown to other users for contact.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                        State*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select your state</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        City*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiHome className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="city"
                          name="city"
                          type="text"
                          value={formData.city}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                          placeholder="Your city"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address (Optional)
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                      placeholder="Your full address (will not be shared publicly)"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This is for your reference only and will not be publicly displayed.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Business Information Tab */}
              {activeTab === 'business' && accountType === 'business' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name*
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiBriefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="businessName"
                        name="businessInfo.businessName"
                        type="text"
                        value={formData.businessInfo.businessName}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            businessInfo: {
                              ...formData.businessInfo,
                              businessName: e.target.value
                            }
                          });
                        }}
                        required={activeTab === 'business'}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        placeholder="Your business name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                        Business Type*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiFileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          id="businessType"
                          name="businessInfo.businessType"
                          value={formData.businessInfo.businessType}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              businessInfo: {
                                ...formData.businessInfo,
                                businessType: e.target.value
                              }
                            });
                          }}
                          required={activeTab === 'business'}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select business type</option>
                          {BUSINESS_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Registration Number*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiFileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="registrationNumber"
                          name="businessInfo.registrationNumber"
                          type="text"
                          value={formData.businessInfo.registrationNumber}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              businessInfo: {
                                ...formData.businessInfo,
                                registrationNumber: e.target.value
                              }
                            });
                          }}
                          required={activeTab === 'business'}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                          placeholder="Business registration number"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                      Website (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiGlobe className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="website"
                        name="businessInfo.website"
                        type="url"
                        value={formData.businessInfo.website}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            businessInfo: {
                              ...formData.businessInfo,
                              website: e.target.value
                            }
                          });
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        placeholder="https://yourbusiness.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="established" className="block text-sm font-medium text-gray-700 mb-1">
                      Established Date (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiCalendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="established"
                        name="businessInfo.established"
                        type="date"
                        value={formData.businessInfo.established}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            businessInfo: {
                              ...formData.businessInfo,
                              established: e.target.value
                            }
                          });
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Business Description (Optional)
                    </label>
                    <textarea
                      id="businessDescription"
                      name="businessInfo.description"
                      rows={3}
                      value={formData.businessInfo.description}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          businessInfo: {
                            ...formData.businessInfo,
                            description: e.target.value
                          }
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                      placeholder="Tell us about your business and how you help reduce food waste..."
                    />
                  </div>
                </div>
              )}
              
              {/* NGO Information Tab */}
              {activeTab === 'ngo' && accountType === 'ngo' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="ngoName" className="block text-sm font-medium text-gray-700 mb-1">
                      NGO Name*
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiHome className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="ngoName"
                        name="ngoInfo.ngoName"
                        type="text"
                        value={formData.ngoInfo.ngoName}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            ngoInfo: {
                              ...formData.ngoInfo,
                              ngoName: e.target.value
                            }
                          });
                        }}
                        required={activeTab === 'ngo'}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        placeholder="Your NGO name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="ngoRegistrationNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Registration Number*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiFileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="ngoRegistrationNumber"
                          name="ngoInfo.registrationNumber"
                          type="text"
                          value={formData.ngoInfo.registrationNumber}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              ngoInfo: {
                                ...formData.ngoInfo,
                                registrationNumber: e.target.value
                              }
                            });
                          }}
                          required={activeTab === 'ngo'}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                          placeholder="NGO registration number"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="cause" className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Cause*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiHeart className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          id="cause"
                          name="ngoInfo.cause"
                          value={formData.ngoInfo.cause}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              ngoInfo: {
                                ...formData.ngoInfo,
                                cause: e.target.value
                              }
                            });
                          }}
                          required={activeTab === 'ngo'}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select primary cause</option>
                          {NGO_CAUSES.map((cause) => (
                            <option key={cause} value={cause}>
                              {cause}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="ngoWebsite" className="block text-sm font-medium text-gray-700 mb-1">
                      Website (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiGlobe className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="ngoWebsite"
                        name="ngoInfo.website"
                        type="url"
                        value={formData.ngoInfo.website}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            ngoInfo: {
                              ...formData.ngoInfo,
                              website: e.target.value
                            }
                          });
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        placeholder="https://yourorganization.org"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="ngoEstablished" className="block text-sm font-medium text-gray-700 mb-1">
                        Established Date (Optional)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiCalendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="ngoEstablished"
                          name="ngoInfo.established"
                          type="date"
                          value={formData.ngoInfo.established}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              ngoInfo: {
                                ...formData.ngoInfo,
                                established: e.target.value
                              }
                            });
                          }}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="reachCount" className="block text-sm font-medium text-gray-700 mb-1">
                        People Reached Annually (Optional)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiUsers className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="reachCount"
                          name="ngoInfo.reachCount"
                          type="number"
                          value={formData.ngoInfo.reachCount}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              ngoInfo: {
                                ...formData.ngoInfo,
                                reachCount: e.target.value
                              }
                            });
                          }}
                          min="1"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                          placeholder="e.g. 5000"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="ngoDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Description (Optional)
                    </label>
                    <textarea
                      id="ngoDescription"
                      name="ngoInfo.description"
                      rows={3}
                      value={formData.ngoInfo.description}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          ngoInfo: {
                            ...formData.ngoInfo,
                            description: e.target.value
                          }
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                      placeholder="Tell us about your organization and how you help reduce food waste..."
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-4 pt-4">
                <Link
                  href="/profile"
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                    saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ProfileEditPage;
