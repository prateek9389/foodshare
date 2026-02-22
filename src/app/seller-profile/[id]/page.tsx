'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiPackage, FiUsers, FiFileText, FiGlobe, FiHeart, FiMessageSquare, FiArrowLeft, FiClock } from 'react-icons/fi';
// Removed unused import: useAuth
import { db } from '../../../firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import Navbar from '../../../components/Navbar';

// Type definitions
interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  accountType?: 'individual' | 'business' | 'ngo';
  createdAt: { seconds: number; nanoseconds: number } | Date;
  profilePicture?: string;
  businessInfo?: {
    businessName: string;
    description: string;
    registrationNumber: string;
    businessType: string;
    website?: string;
    establishedDate?: { seconds: number; nanoseconds: number } | Date;
    employeeCount?: number;
    profileImage?: string;
    galleryImages?: string[];
    paymentQR?: string;
  };
  ngoInfo?: {
    ngoName: string;
    description: string;
    registrationNumber: string;
    cause: string;
    website?: string;
    establishedDate?: { seconds: number; nanoseconds: number } | Date;
    reachCount?: number;
    profileImage?: string;
    galleryImages?: string[];
    paymentQR?: string;
  };
}

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  expiryDate: Date;
  createdAt: Date;
  userId: string;
  userName: string;
  userContact: string;
  condition: string;
  location: {
    address: string;
    city: string;
    state: string;
  };
  isDonation: boolean;
  quantity: number;
  viewCount: number;
  isAvailable: boolean;
}


const SellerProfilePage = () => {
  // Use useParams() for client components in App Router
  const params = useParams();

  const id = params.id as string;
  const router = useRouter();
  
  // Helper function to convert Firestore timestamp to readable date string
  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | Date | undefined): string => {
    if (!timestamp) return 'Unknown';
    
    try {
      // If it's a Firestore timestamp with seconds (type narrowing)
      if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      // If it's already a Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      // Fallback case
      return 'Unknown';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };
 
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Fetch seller profile and listings
  useEffect(() => {
    const fetchSellerProfile = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', id as string);
        const userSnapshot = await getDoc(userDocRef);
        
        if (!userSnapshot.exists()) {
          setError('Seller profile not found');
          setLoading(false);
          return;
        }
        
        const userData = userSnapshot.data();
        const profileData: UserProfile = {
          id: userSnapshot.id,
          displayName: userData.displayName || userData.name || 'User',
          email: userData.email || '',
          phone: userData.phone || userData.mobileNumber,
          address: userData.address,
          city: userData.city,
          state: userData.state,
          accountType: userData.accountType,
          createdAt: userData.createdAt.toDate(),
          profilePicture: userData.profilePicture || userData.profileImage,
          businessInfo: userData.businessInfo ? {
            businessName: userData.businessInfo.businessName || '',
            description: userData.businessInfo.description || '',
            registrationNumber: userData.businessInfo.registrationNumber || '',
            businessType: userData.businessInfo.businessType || '',
            website: userData.businessInfo.website,
            establishedDate: userData.businessInfo.establishedDate?.toDate?.() || userData.businessInfo.establishedDate,
            employeeCount: userData.businessInfo.employeeCount,
            profileImage: userData.businessInfo.profileImage,
            galleryImages: userData.businessInfo.galleryImages,
            paymentQR: userData.businessInfo.paymentQR
          } : undefined,
          ngoInfo: userData.ngoInfo ? {
            ngoName: userData.ngoInfo.ngoName || '',
            description: userData.ngoInfo.description || '',
            registrationNumber: userData.ngoInfo.registrationNumber || '',
            cause: userData.ngoInfo.cause || '',
            website: userData.ngoInfo.website,
            establishedDate: userData.ngoInfo.establishedDate?.toDate?.() || userData.ngoInfo.establishedDate,
            reachCount: userData.ngoInfo.reachCount,
            profileImage: userData.ngoInfo.profileImage,
            galleryImages: userData.ngoInfo.galleryImages,
            paymentQR: userData.ngoInfo.paymentQR
          } : undefined
        };
        setProfile(profileData);
        
        // Fetch seller's listings
        const listingsQuery = query(
          collection(db, 'foodListings'),
          where('userId', '==', id),
          where('isAvailable', '==', true),
          limit(6)
        );
        
        const listingsSnapshot = await getDocs(listingsQuery);
        const listingsData = listingsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            expiryDate: data.expiryDate.toDate(),
            createdAt: data.createdAt.toDate()
          } as Listing;
        });
        
        setListings(listingsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching seller profile:', err);
        setError('Failed to load seller profile. Please try again.');
        setLoading(false);
      }
    };
    
    fetchSellerProfile();
  }, [id]);
  
  // The formatDate function is already defined above
  
  // Contact seller
  const contactSeller = () => {
    if (!profile) return;
    router.push(`/messages?userId=${profile.id}`);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex flex-col items-center justify-center h-80">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                <p className="mt-4 text-gray-600">Loading seller profile...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <FiUser className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <Link href="/listings">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Back to Listings
                  </button>
                </Link>
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-8">
              {/* Back button */}
              <div>
                <button 
                  onClick={() => router.back()}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <FiArrowLeft className="mr-2" /> Back
                </button>
              </div>
              
              {/* Profile Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative h-48 bg-gradient-to-r from-green-400 to-blue-500">
                  {/* Header background */}
                </div>
                
                <div className="px-6 py-8 md:px-8 -mt-16 relative">
                  {/* Profile image */}
                  <div className="absolute -top-16 left-6 md:left-8">
                    <div className="h-32 w-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden">
                      {profile.profilePicture ? (
                        <div className="relative h-full w-full">
                          <Image 
                            src={profile.profilePicture} 
                            alt={profile.displayName || 'User profile'}
                            fill
                            className="object-cover"
                            sizes="128px"
                          />
                        </div>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400">
                          <FiUser size={48} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Profile info */}
                  <div className="pt-16 md:flex md:justify-between md:items-center">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {profile.accountType === 'business' ? profile.businessInfo?.businessName : 
                         profile.accountType === 'ngo' ? profile.ngoInfo?.ngoName : 
                         profile.displayName}
                      </h1>
                      <div className="flex items-center mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          profile.accountType === 'business' ? 'bg-blue-100 text-blue-800' : 
                          profile.accountType === 'ngo' ? 'bg-purple-100 text-purple-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {profile.accountType === 'business' ? 'Business Account' : 
                           profile.accountType === 'ngo' ? 'NGO Account' : 
                           'Individual Account'}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          Member since {profile.createdAt ? formatDate(profile.createdAt) : 'Unknown'}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-2">
                        {profile.accountType === 'business' ? profile.businessInfo?.description : 
                         profile.accountType === 'ngo' ? profile.ngoInfo?.description : 
                         'Individual food sharing user'}
                      </p>
                    </div>
                    <div className="mt-4 md:mt-0">
                      <button 
                        onClick={contactSeller}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center"
                      >
                        <FiMessageSquare className="mr-2" /> Contact
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Contact Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800">Contact Information</h2>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <FiUser className="text-green-500 mt-1 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{profile.displayName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <FiMail className="text-green-500 mt-1 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                    </div>
                    
                    {profile.phone && (
                      <div className="flex items-start">
                        <FiPhone className="text-green-500 mt-1 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">{profile.phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {(profile.address || (profile.city && profile.state)) && (
                      <div className="flex items-start">
                        <FiMapPin className="text-green-500 mt-1 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="font-medium">
                            {profile.address && `${profile.address}, `}
                            {profile.city && profile.state ? `${profile.city}, ${profile.state}` : 
                             profile.city || profile.state}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Business/NGO Details */}
                {(profile.accountType === 'business' || profile.accountType === 'ngo') && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">
                      {profile.accountType === 'business' ? 'Business Details' : 'NGO Details'}
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.accountType === 'business' && profile.businessInfo && (
                        <>
                          <div className="flex items-start">
                            <FiFileText className="text-blue-500 mt-1 mr-3" />
                            <div>
                              <p className="text-sm text-gray-500">Registration Number</p>
                              <p className="font-medium">{profile.businessInfo.registrationNumber}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <FiPackage className="text-blue-500 mt-1 mr-3" />
                            <div>
                              <p className="text-sm text-gray-500">Business Type</p>
                              <p className="font-medium">{profile.businessInfo.businessType}</p>
                            </div>
                          </div>
                          
                          {profile.businessInfo.establishedDate && (
                            <div className="flex items-start">
                              <FiCalendar className="text-blue-500 mt-1 mr-3" />
                              <div>
                                <p className="text-sm text-gray-500">Established</p>
                                <p className="font-medium">
                                  {profile.businessInfo.establishedDate 
                                    ? formatDate(profile.businessInfo.establishedDate) 
                                    : 'Not specified'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {profile.businessInfo.employeeCount && (
                            <div className="flex items-start">
                              <FiUsers className="text-blue-500 mt-1 mr-3" />
                              <div>
                                <p className="text-sm text-gray-500">Employees</p>
                                <p className="font-medium">{profile.businessInfo.employeeCount}</p>
                              </div>
                            </div>
                          )}
                          
                          {profile.businessInfo.website && (
                            <div className="flex items-start">
                              <FiGlobe className="text-blue-500 mt-1 mr-3" />
                              <div>
                                <p className="text-sm text-gray-500">Website</p>
                                <a 
                                  href={profile.businessInfo.website.startsWith('http') 
                                    ? profile.businessInfo.website 
                                    : `https://${profile.businessInfo.website}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-medium text-blue-600 hover:underline"
                                >
                                  {profile.businessInfo.website}
                                </a>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {profile.accountType === 'ngo' && profile.ngoInfo && (
                        <>
                          <div className="flex items-start">
                            <FiFileText className="text-purple-500 mt-1 mr-3" />
                            <div>
                              <p className="text-sm text-gray-500">Registration Number</p>
                              <p className="font-medium">{profile.ngoInfo.registrationNumber}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <FiHeart className="text-purple-500 mt-1 mr-3" />
                            <div>
                              <p className="text-sm text-gray-500">Cause</p>
                              <p className="font-medium">{profile.ngoInfo.cause}</p>
                            </div>
                          </div>
                          
                          {profile.ngoInfo.establishedDate && (
                            <div className="flex items-start">
                              <FiCalendar className="text-purple-500 mt-1 mr-3" />
                              <div>
                                <p className="text-sm text-gray-500">Established</p>
                                <p className="font-medium">
                                  {profile.ngoInfo.establishedDate
                                    ? formatDate(profile.ngoInfo.establishedDate)
                                    : 'Not specified'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {profile.ngoInfo.reachCount && (
                            <div className="flex items-start">
                              <FiUsers className="text-purple-500 mt-1 mr-3" />
                              <div>
                                <p className="text-sm text-gray-500">People Impacted</p>
                                <p className="font-medium">{profile.ngoInfo.reachCount.toLocaleString()}</p>
                              </div>
                            </div>
                          )}
                          
                          {profile.ngoInfo.website && (
                            <div className="flex items-start">
                              <FiGlobe className="text-purple-500 mt-1 mr-3" />
                              <div>
                                <p className="text-sm text-gray-500">Website</p>
                                <a 
                                  href={profile.ngoInfo.website.startsWith('http') 
                                    ? profile.ngoInfo.website 
                                    : `https://${profile.ngoInfo.website}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-medium text-purple-600 hover:underline"
                                >
                                  {profile.ngoInfo.website}
                                </a>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Gallery Section - Only for Business/NGO */}
              {((profile.accountType === 'business' && profile.businessInfo?.galleryImages?.length) || 
               (profile.accountType === 'ngo' && profile.ngoInfo?.galleryImages?.length)) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800">Gallery</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {profile.accountType === 'business' && profile.businessInfo?.galleryImages?.map((img, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <div className="relative w-full h-full">
                          <Image 
                            src={img} 
                            alt={`Business gallery ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        </div>
                      </div>
                    ))}
                    
                    {profile.accountType === 'ngo' && profile.ngoInfo?.galleryImages?.map((img, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <div className="relative w-full h-full">
                          <Image 
                            src={img} 
                            alt={`NGO gallery ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Payment QR - Only for Business/NGO */}
              {((profile.accountType === 'business' && profile.businessInfo?.paymentQR) || 
               (profile.accountType === 'ngo' && profile.ngoInfo?.paymentQR)) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800">
                    {profile.accountType === 'business' ? 'Payment Information' : 'Donation Information'}
                  </h2>
                  <div className="flex flex-col items-center md:flex-row md:items-start">
                    <div className="w-48 h-48 bg-white rounded-lg border border-gray-200 p-2 mb-4 md:mb-0 md:mr-6">
                      <div className="relative w-full h-full">
                        <Image 
                          src={profile.accountType === 'business' 
                            ? profile.businessInfo?.paymentQR as string
                            : profile.ngoInfo?.paymentQR as string} 
                          alt="Payment QR code"
                          fill
                          className="object-contain"
                          sizes="192px"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-700">
                        {profile.accountType === 'business' 
                          ? 'Scan this QR code to make a payment to this business.'
                          : 'Scan this QR code to make a donation to this NGO.'}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        Supported payment methods: UPI, PhonePe, Google Pay, Paytm
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Listings Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Active Listings</h2>
                  <Link href={`/listings?userId=${profile.id}`} className="text-green-600 hover:text-green-700 text-sm font-medium">
                    View all
                  </Link>
                </div>
                
                {listings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listings.map(listing => (
                      <Link href={`/listings/${listing.id}`} key={listing.id}>
                        <motion.div
                          whileHover={{ y: -5 }}
                          className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="relative aspect-[4/3]">
                            <Image
                              src={listing.imageUrl}
                              alt={listing.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                            {listing.isDonation ? (
                              <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-1 text-xs m-2 rounded-md">
                                Donation
                              </div>
                            ) : (
                              <div className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-1 text-xs m-2 rounded-md">
                                ₹{listing.price}
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-gray-800 font-medium truncate">{listing.title}</h3>
                            <p className="text-gray-500 text-sm mt-1 truncate">{listing.category}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center text-xs text-gray-500">
                                <FiClock className="mr-1" size={12} />
                                <span>Expires: {formatDate(listing.expiryDate)}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No active listings found</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default SellerProfilePage;
