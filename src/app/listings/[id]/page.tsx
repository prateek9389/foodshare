'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiMapPin, FiPhone, FiUser, FiTag, FiBox, FiCalendar, FiChevronLeft, FiChevronRight, FiHeart, FiShare2, FiDollarSign, FiGift, FiEdit, FiArrowLeft, FiStar, FiArrowRight, FiMail, FiShoppingCart } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase';
import { doc, getDoc, deleteDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import Navbar from '../../../components/Navbar';
import FoodCard from '../../../components/FoodCard';
import { FoodListing } from '../../../models/FoodListing';

const ListingDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [listing, setListing] = useState<FoodListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [buying, setBuying] = useState(false);
  const [similarListings, setSimilarListings] = useState<FoodListing[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [sellerInfo, setSellerInfo] = useState<{
    name: string;
    email: string;
    accountType: 'individual' | 'business' | 'ngo';
    profileImage?: string;
  } | null>(null);
  
  // Contact seller function
  const contactSeller = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (!user?.uid || !listing) return;
    
    // Don't allow contacting your own listing
    if (user.uid === listing.userId) return;
    
    try {
      setContacting(true);
      
     
     
      
     
      
    } catch (err) {
      console.error('Error proceeding to checkout:', err);
      setError('Failed to proceed to checkout. Please try again.');
    } finally {
      setBuying(false);
    }
  };
  
  // Buy item function
  const buyItem = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (!user?.uid || !listing) return;
    
    // Don't allow buying your own listing
    if (user.uid === listing.userId) {
      setError("You cannot purchase your own listing");
      return;
    }
    
    try {
      setBuying(true);
      
      // Redirect to checkout page with the listing ID
      router.push(`/checkout?listingId=${listing.id}`);
    } catch (err) {
      console.error('Error proceeding to checkout:', err);
      setError('Failed to proceed to checkout. Please try again.');
    } finally {
      setBuying(false);
    }
  };
  
  // Fetch the listing data
  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const docRef = doc(db, 'foodListings', id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedListing = {
            id: docSnap.id,
            ...data,
            expiryDate: data.expiryDate.toDate(),
            createdAt: data.createdAt.toDate()
          } as FoodListing;
          
          // Fetch seller information
          const userDocRef = doc(db, 'users', data.userId);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setSellerInfo({
              name: userData.displayName || userData.name || 'User',
              email: userData.email || 'No email provided',
              accountType: userData.accountType || 'individual',
              profileImage: userData.profilePicture || ''
            });
          }
          
          setListing(fetchedListing);
          
          // Once we have the listing data, fetch similar listings
          fetchSimilarListings(fetchedListing);
        } else {
          setError('Listing not found');
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchListing();
  }, [id]);
  
  // Fetch similar listings based on category and location
  const fetchSimilarListings = async (currentListing: FoodListing) => {
    if (!currentListing) return;
    
    setLoadingSimilar(true);
    try {
      // Query listings with the same category, excluding the current listing
      let q = query(
        collection(db, 'foodListings'),
        where('category', '==', currentListing.category),
        where('__name__', '!=', currentListing.id),
        limit(4)
      );
      
      const querySnapshot = await getDocs(q);
      const results: FoodListing[] = [];
      
      // If we don't have enough results, try location-based
      if (querySnapshot.size < 4) {
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          results.push({
            id: doc.id,
            ...data,
            expiryDate: data.expiryDate.toDate(),
            createdAt: data.createdAt.toDate()
          } as FoodListing);
        });
        
        // Try to get more listings based on location
        if (currentListing.location.city) {
          q = query(
            collection(db, 'foodListings'),
            where('location.city', '==', currentListing.location.city),
            where('__name__', '!=', currentListing.id),
            limit(4 - results.length)
          );
          
          const locationSnapshot = await getDocs(q);
          locationSnapshot.forEach((doc) => {
            // Skip if we already have this listing
            if (results.some(item => item.id === doc.id)) return;
            
            const data = doc.data();
            results.push({
              id: doc.id,
              ...data,
              expiryDate: data.expiryDate.toDate(),
              createdAt: data.createdAt.toDate()
            } as FoodListing);
          });
        }
      } else {
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          results.push({
            id: doc.id,
            ...data,
            expiryDate: data.expiryDate.toDate(),
            createdAt: data.createdAt.toDate()
          } as FoodListing);
        });
      }
      
      // If we still need more, get random listings
      if (results.length < 4) {
        q = query(
          collection(db, 'foodListings'),
          where('__name__', '!=', currentListing.id),
          limit(4 - results.length)
        );
        
        const randomSnapshot = await getDocs(q);
        randomSnapshot.forEach((doc) => {
          // Skip if we already have this listing
          if (results.some(item => item.id === doc.id)) return;
          
          const data = doc.data();
          results.push({
            id: doc.id,
            ...data,
            expiryDate: data.expiryDate.toDate(),
            createdAt: data.createdAt.toDate()
          } as FoodListing);
        });
      }
      
      setSimilarListings(results);
    } catch (err) {
      console.error('Error fetching similar listings:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };
  
  // Check if the listing is in user's wishlist
  useEffect(() => {
    const checkWishlist = async () => {
      if (!isAuthenticated || !user?.uid || !id) return;
      
      try {
        const wishlistRef = doc(db, 'wishlist', `${user.uid}_${id}`);
        const wishlistSnap = await getDoc(wishlistRef);
        
        setIsWishlisted(wishlistSnap.exists());
      } catch (err) {
        console.error('Error checking wishlist:', err);
      }
    };
    
    checkWishlist();
  }, [isAuthenticated, user, id]);
  
  // Image navigation handlers
  const nextImage = () => {
    if (!listing?.imageUrls || listing.imageUrls.length === 0) return;
    const imagesCount = listing.imageUrls.length;
    setActiveImageIndex((prev) => (prev + 1) % imagesCount);
  };
  
  const prevImage = () => {
    if (!listing?.imageUrls || listing.imageUrls.length === 0) return;
    const imagesCount = listing.imageUrls.length;
    setActiveImageIndex((prev) => (prev - 1 + imagesCount) % imagesCount);
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };
  
  // Calculate days remaining until expiry
  const getDaysRemaining = (expiryDate: Date) => {
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Expired', className: 'text-red-600 bg-red-100' };
    } else if (diffDays === 0) {
      return { text: 'Expires Today', className: 'text-orange-600 bg-orange-100' };
    } else if (diffDays === 1) {
      return { text: '1 day left', className: 'text-orange-600 bg-orange-100' };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} days left`, className: 'text-yellow-600 bg-yellow-100' };
    } else {
      return { text: `${diffDays} days left`, className: 'text-green-600 bg-green-100' };
    }
  };
  
  // Toggle wishlist
  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (!user?.uid || !id) return;
    
    try {
      const wishlistRef = doc(db, 'wishlist', `${user.uid}_${id}`);
      
      if (isWishlisted) {
        // Remove from wishlist
        await deleteDoc(wishlistRef);
      } else {
        // Add to wishlist
        await setDoc(wishlistRef, {
          userId: user.uid,
          listingId: id,
          createdAt: new Date()
        });
      }
      
      setIsWishlisted(!isWishlisted);
    } catch (err) {
      console.error('Error updating wishlist:', err);
    }
  };
  
  // Share listing
  const shareListing = () => {
    if (navigator.share) {
      navigator.share({
        title: listing?.title,
        text: `Check out ${listing?.title} on FoodShare!`,
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying to clipboard:', err));
    }
  };
  
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col justify-center items-center h-[60vh]">
            <motion.div 
              className="relative w-28 h-28"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="absolute inset-0 rounded-full border-4 border-green-100 shadow-md"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div 
                className="absolute inset-0 rounded-full border-t-4 border-green-500"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>
            <motion.p 
              className="mt-8 text-lg text-gray-700 font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Loading delicious details...
            </motion.p>
            <motion.div
              className="mt-4 bg-green-50 text-green-600 px-4 py-2 rounded-full text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Please wait while we gather the freshest information
            </motion.div>
          </div>
        </div>
      </>
    );
  }
  
  if (error || !listing) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <motion.div 
            className="flex flex-col items-center justify-center min-h-[50vh] text-center bg-white py-12 px-6 sm:px-12 rounded-2xl shadow-md border border-gray-100"
            style={{
              backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(249,250,251,0.8) 100%)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="w-28 h-28 mb-8 text-red-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, 0] }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </motion.div>
            
            <motion.h2 
              className="text-2xl sm:text-3xl font-bold text-gray-800 mb-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {error || 'Listing Not Found'}
            </motion.h2>
            
            <motion.p 
              className="text-gray-600 mb-10 max-w-md text-lg leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Sorry, we couldn&apos;t find the listing you were looking for. It may have been removed or the link is incorrect.
            </motion.p>
            
            <motion.div
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link 
                href="/listings" 
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <FiArrowLeft size={18} />
                Browse All Listings
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </>
    );
  }
  
  const expiryStatus = getDaysRemaining(listing.expiryDate);

  return (
    <>
      <Navbar />
      <div className="bg-white min-h-screen py-8 sm:py-12 pb-32"> {/* Increased padding bottom for mobile button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <motion.div 
            className="text-sm text-gray-600 mb-8 flex items-center space-x-3 flex-wrap"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link href="/" className="hover:text-green-600 transition-colors duration-200 flex items-center px-3 py-1.5 bg-gray-50 rounded-full">
              <FiArrowLeft className="mr-1.5" /> Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/listings" className="hover:text-green-600 transition-colors duration-200 px-3 py-1.5 bg-gray-50 rounded-full">Listings</Link>
            <span className="text-gray-400">/</span>
            <span className="text-green-600 font-medium truncate max-w-[150px] sm:max-w-[300px] bg-green-50 px-3 py-1.5 rounded-full">{listing.title}</span>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(246,249,252,0.8) 100%)',
            }}
          >
            <div className="flex flex-col lg:flex-row">
              {/* Image Gallery */}
              <motion.div 
                className="lg:w-1/2 relative"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="relative h-[350px] sm:h-[400px] lg:h-[500px] w-full overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImageIndex}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={listing.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls[activeImageIndex] : listing.imageUrl}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                      />
                    </motion.div>
                  </AnimatePresence>
                  
                  {listing.imageUrls && listing.imageUrls.length > 1 && (
                    <>
                      <motion.button 
                        onClick={prevImage}
                        whileHover={{ scale: 1.1, x: -2 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-green-600 p-3 rounded-full backdrop-blur-sm shadow-lg z-10"
                      >
                        <FiChevronLeft size={24} />
                      </motion.button>
                      <motion.button 
                        onClick={nextImage}
                        whileHover={{ scale: 1.1, x: 2 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-green-600 p-3 rounded-full backdrop-blur-sm shadow-lg z-10"
                      >
                        <FiChevronRight size={24} />
                      </motion.button>
                      
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                        {listing.imageUrls && listing.imageUrls.map((_, index) => (
                          <motion.button
                            key={index}
                            onClick={() => setActiveImageIndex(index)}
                            className={`w-3 h-3 rounded-full ${index === activeImageIndex ? 'bg-white' : 'bg-gray-400'}`}
                            whileHover={{ scale: 1.5 }}
                            whileTap={{ scale: 0.9 }}
                            animate={index === activeImageIndex ? 
                              { scale: [1, 1.2, 1], opacity: 1 } : 
                              { opacity: 0.7 }
                            }
                            transition={{ duration: 0.3 }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  
                  {/* Type Badge */}
                  <motion.div 
                    className="absolute top-4 left-4"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold shadow-md ${listing.isDonation ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'}`}>
                      {listing.isDonation ? (
                        <span className="flex items-center">
                          <FiGift className="mr-1" /> Donation
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <FiDollarSign className="mr-1" /> {listing.price ? `₹${listing.price}` : 'Free'}
                        </span>
                      )}
                    </span>
                  </motion.div>
                </div>
                
                {/* Thumbnail Gallery */}
                {listing.imageUrls && listing.imageUrls.length > 1 && (
                  <div className="flex overflow-x-auto p-4 gap-3 bg-white border-t border-gray-100 scrollbar-hide">
                    {listing.imageUrls && listing.imageUrls.map((url, index) => (
                      <motion.div 
                        key={index}
                        onClick={() => setActiveImageIndex(index)}
                        className={`relative w-20 h-20 flex-shrink-0 cursor-pointer rounded-lg overflow-hidden shadow-sm ${index === activeImageIndex ? 'ring-3 ring-green-500 ring-offset-2' : 'opacity-70 hover:opacity-100'}`}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Image
                          src={url}
                          alt={`Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
              
              {/* Listing Details */}
              <motion.div 
                className="lg:w-1/2 p-6 sm:p-8 lg:p-10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <motion.h1 
                    className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    {listing.title}
                  </motion.h1>
                  <div className="flex space-x-3">
                    <motion.button
                      onClick={toggleWishlist}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-3 rounded-full shadow-sm ${isWishlisted ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-white text-gray-600 hover:text-red-500 hover:bg-red-50 border border-gray-200'}`}
                    >
                      <FiHeart className={isWishlisted ? 'fill-current' : ''} size={20} />
                    </motion.button>
                    <motion.button
                      onClick={shareListing}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-3 rounded-full bg-white text-gray-600 hover:text-indigo-500 hover:bg-indigo-50 shadow-sm border border-gray-200"
                    >
                      <FiShare2 size={20} />
                    </motion.button>
                  </div>
                </div>
                
                <div className="mt-6 inline-block px-5 py-2.5 bg-green-50 border border-green-100 rounded-full shadow-sm">
                  <div className="flex items-center text-gray-700">
                    <FiMapPin className="mr-2 text-green-500" size={18} />
                    <span className="font-medium">{listing.location.city}, {listing.location.state}</span>
                  </div>
                </div>
                
                <div className="mt-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <motion.div 
                      className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm"
                      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)' }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="text-sm text-gray-500 mb-1">Category</div>
                      <div className="flex items-center font-semibold text-gray-800">
                        <FiTag className="mr-2 text-green-500" size={18} />
                        {listing.category}
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm"
                      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)' }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="text-sm text-gray-500 mb-1">Quantity</div>
                      <div className="flex items-center font-semibold text-gray-800">
                        <FiBox className="mr-2 text-green-500" size={18} />
                        {listing.quantity}
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm"
                      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)' }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="text-sm text-gray-500 mb-1">Expiry Date</div>
                      <div className="flex items-center font-semibold text-gray-800">
                        <FiCalendar className="mr-2 text-green-500" size={18} />
                        {formatDate(listing.expiryDate)}
                      </div>
                    </motion.div>
                  </div>
                  
                  <motion.div 
                    className={`inline-block px-5 py-2.5 rounded-full text-sm font-semibold ${expiryStatus.className} mb-8 shadow-sm border`}
                    style={{
                      borderColor: expiryStatus.text === 'Expired' ? 'rgba(220, 38, 38, 0.2)' : 
                                 expiryStatus.text === 'Expires Today' || expiryStatus.text === '1 day left' ? 'rgba(234, 88, 12, 0.2)' : 
                                 expiryStatus.text.includes('days left') && parseInt(expiryStatus.text) <= 3 ? 'rgba(202, 138, 4, 0.2)' : 
                                 'rgba(22, 163, 74, 0.2)'
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <FiClock className="inline mr-2" size={16} /> {expiryStatus.text}
                  </motion.div>
                  
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Description</h2>
                    <motion.div 
                      className="text-gray-700 whitespace-pre-line bg-white p-6 rounded-xl shadow-sm border border-gray-100"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      <p className="leading-relaxed">{listing.description}</p>
                    </motion.div>
                  </div>
                  
                  <motion.div 
                    className="border-t border-gray-200 pt-8 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    <h2 className="text-xl font-semibold mb-6 text-gray-800">Contact Information</h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                      <div className="flex items-center text-gray-700">
                        <div className="bg-green-50 p-3 rounded-full mr-4 border border-green-100">
                          <FiUser className="text-green-500" size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 mb-1">Name</div>
                          <div className="flex items-center">
                            <span className="font-medium">{listing.userName}</span>
                            {sellerInfo && (
                              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${sellerInfo.accountType === 'business' ? 'bg-blue-100 text-blue-800' : sellerInfo.accountType === 'ngo' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                {sellerInfo.accountType.charAt(0).toUpperCase() + sellerInfo.accountType.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <div className="bg-green-50 p-3 rounded-full mr-4 border border-green-100">
                          <FiPhone className="text-green-500" size={20} />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Contact</div>
                          <span className="font-medium">{listing.userContact}</span>
                        </div>
                      </div>
                      {sellerInfo && (
                        <div className="flex items-center text-gray-700">
                          <div className="bg-green-50 p-3 rounded-full mr-4 border border-green-100">
                            <FiMail className="text-green-500" size={20} />
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Email</div>
                            <span className="font-medium">{sellerInfo.email}</span>
                          </div>
                        </div>
                      )}
                      <div className="pt-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Link href={`/seller-profile/${listing.userId}`} className="w-full">
                          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                            <FiUser className="mr-2" />
                            View Profile
                          </button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Contact action button - only shows in main content on desktop */}
                  <div className="hidden lg:block mt-16">
                    {!isAuthenticated ? (
                      <motion.button
                        onClick={() => router.push('/login')}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-12 px-8 rounded-xl font-medium transition-all flex items-center justify-center shadow-md hover:shadow-lg"
                      >
                        <FiUser className="mr-3" size={20} /> Login to Contact
                      </motion.button>
                    ) : user?.uid === listing.userId ? (
                      <Link href={`/my-listings/edit/${listing.id}`} className="block w-full">
                        <motion.div
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-12 px-8 rounded-xl font-medium transition-all flex items-center justify-center shadow-md hover:shadow-lg"
                        >
                          <FiEdit className="mr-3" size={20} /> Edit Your Listing
                        </motion.div>
                      </Link>
                    ) : (
                      <motion.button
                        onClick={contactSeller}
                        disabled={contacting}
                        whileHover={contacting ? {} : { y: -3 }}
                        whileTap={contacting ? {} : { scale: 0.98 }}
                        className={`w-full ${listing.isDonation ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'} text-white py-4 px-8 rounded-xl font-medium transition-all flex items-center justify-center shadow-md hover:shadow-lg ${contacting ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {contacting ? (
                          <>
                            <div className="mr-3 h-5 w-5 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                            Connecting...
                          </>
                        ) : listing.isDonation ? (
                          <>
                            <FiGift className="mr-3" size={20} /> Contact Donor
                          </>
                        ) : (
                          <>
                            <FiDollarSign className="mr-3" size={20} /> 
                            {listing.price ? `Contact Seller` : 'Contact Provider'}
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Related listings section */}
          <motion.div
            className="mt-16 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100"
              style={{
                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(246,249,252,0.8) 100%)',
                borderRadius: '1.5rem'
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                    <FiStar className="mr-3 text-yellow-500" size={22} /> 
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-green-700">Similar Listings</span>
                  </h2>
                  
                  <p className="text-gray-600 max-w-lg">
                    Discover more food items available in your area. Reduce food waste together!
                  </p>
                </div>
                
                <Link href="/listings" className="block">
                  <motion.div
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-white text-green-600 border border-green-200 rounded-full font-medium shadow-sm hover:shadow flex items-center whitespace-nowrap"
                  >
                    View All Listings <FiArrowRight className="ml-2" />
                  </motion.div>
                </Link>
              </div>
              
              {loadingSimilar ? (
                <div className="h-52 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-green-100 border-t-green-500 rounded-full shadow-md"
                  />
                </div>
              ) : similarListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {similarListings.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <FoodCard
                        id={item.id}
                        title={item.title}
                        imageUrl={item.imageUrl}
                        description={item.description}
                        location={`${item.location.city}, ${item.location.state}`}
                        price={item.price}
                        isDonation={item.isDonation}
                        expiryDate={item.expiryDate}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-52 flex flex-col items-center justify-center bg-green-50 rounded-xl border border-green-100">
                  <p className="text-gray-500 text-lg mb-4">No similar listings found</p>
                  <Link href="/listings" className="text-green-600 hover:text-green-700 font-medium flex items-center">
                    <span>Browse all listings</span> <FiArrowRight className="ml-2" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Floating contact button - only visible on mobile and tablet */}
      {listing && (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 p-4 z-50 lg:hidden"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          style={{ marginBottom: '60px' }} /* Increased margin from bottom for mobile menu */
        >
          <div className="backdrop-blur-md bg-white/80 rounded-2xl p-4 max-w-xl mx-auto shadow-xl border border-gray-100">
            {!isAuthenticated ? (
              <motion.button
                onClick={() => router.push('/login')}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 px-8 rounded-xl font-medium transition-all flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                <FiUser className="mr-3" size={20} /> Login to Contact
              </motion.button>
            ) : user?.uid === listing.userId ? (
              <Link href={`/my-listings/edit/${listing.id}`} className="block w-full">
                <motion.div
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-4 px-8 rounded-xl font-medium transition-all flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  <FiEdit className="mr-3" size={20} /> Edit Your Listing
                </motion.div>
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row w-full space-y-3 sm:space-y-0 sm:space-x-3">
                <motion.button
                  onClick={buyItem}
                  disabled={buying}
                  whileHover={buying ? {} : { y: -3 }}
                  whileTap={buying ? {} : { scale: 0.98 }}
                  className={`sm:w-1/2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 px-4 rounded-xl font-medium transition-all flex items-center justify-center shadow-lg hover:shadow-xl ${buying ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {buying ? (
                    <>
                      <div className="mr-3 h-5 w-5 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiShoppingCart className="mr-3" size={20} /> 
                      {listing.isDonation ? 'Claim Item' : `Buy Now - ${listing.price ? `₹${listing.price}` : 'Free'}`}
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  onClick={contactSeller}
                  disabled={contacting}
                  whileHover={contacting ? {} : { y: -3 }}
                  whileTap={contacting ? {} : { scale: 0.98 }}
                  className={`sm:w-1/2 ${listing.isDonation ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'} text-white py-4 px-4 rounded-xl font-medium transition-all flex items-center justify-center shadow-lg hover:shadow-xl ${contacting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {contacting ? (
                    <>
                      <div className="mr-3 h-5 w-5 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                      Connecting...
                    </>
                  ) : listing.isDonation ? (
                    <>
                      <FiGift className="mr-3" size={20} /> Contact Donor
                    </>
                  ) : (
                    <>
                      <FiDollarSign className="mr-3" size={20} /> 
                      {listing.price ? `Contact Seller` : 'Contact Provider'}
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
};

export default ListingDetailPage;