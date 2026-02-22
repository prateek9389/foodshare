'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot, doc, getDoc } from 'firebase/firestore';
import { FiMapPin, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import FoodCard from '../../components/FoodCard';
import { FoodListing } from '../../models/FoodListing';

const ITEMS_PER_PAGE = 12;

const ListingsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    searchTerm: '',
    category: '',
    city: '',
    isDonation: false,
    isFree: false,
    sortBy: 'newest'
  });

  // Fetch user data to get the city for potential filtering
  useEffect(() => {
    const fetchUserCity = async () => {
      if (isAuthenticated && user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserCity(userData?.city || null);
            
            // We don't automatically set city filter now - showing all listings by default
            // City is available in the filter dropdown if user wants to filter by their city
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      }
    };
    
    fetchUserCity();
  }, [isAuthenticated, user]);

  // Initial fetch of listings
  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchListings = async (fetchMore = false) => {
    setLoading(true);
    setError('');
    
    try {
      let listingsQuery = query(
        collection(db, 'foodListings'), 
        where('isAvailable', '==', true)
      );
      
      // Apply city filter if set
      if (filters.city) {
        listingsQuery = query(
          listingsQuery,
          where('location.city', '==', filters.city)
        );
      }
      
      // Apply donation filter if set
      if (filters.isDonation) {
        listingsQuery = query(
          listingsQuery,
          where('isDonation', '==', true)
        );
      }
      
      // Apply free filter if set
      if (filters.isFree) {
        listingsQuery = query(
          listingsQuery,
          where('price', '==', 0)
        );
      }
      
      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          listingsQuery = query(listingsQuery, orderBy('createdAt', 'desc'));
          break;
        case 'expiringSoon':
          listingsQuery = query(listingsQuery, orderBy('expiryDate', 'asc'));
          break;
        case 'priceAsc':
          listingsQuery = query(listingsQuery, orderBy('price', 'asc'));
          break;
        case 'priceDesc':
          listingsQuery = query(listingsQuery, orderBy('price', 'desc'));
          break;
      }
      
      // Apply pagination
      if (fetchMore && lastVisible) {
        listingsQuery = query(
          listingsQuery,
          startAfter(lastVisible),
          limit(ITEMS_PER_PAGE)
        );
      } else {
        listingsQuery = query(
          listingsQuery,
          limit(ITEMS_PER_PAGE)
        );
      }
      
      const querySnapshot = await getDocs(listingsQuery);
      
      // Set the last visible document for pagination
      if (!querySnapshot.empty) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else {
        setLastVisible(null);
      }
      
      // Check if there are more items to load
      setHasMore(querySnapshot.docs.length === ITEMS_PER_PAGE);
      
      const fetchedListings = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          expiryDate: data.expiryDate.toDate(),
          createdAt: data.createdAt.toDate()
        } as FoodListing;
      });
      
      if (fetchMore) {
        setListings(prev => [...prev, ...fetchedListings]);
      } else {
        setListings(fetchedListings);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to fetch listings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Submit search form
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };
  
  // Update filter state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFilterChange = (field: string, value: unknown) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      category: '',
      city: '',
      isDonation: false,
      isFree: false,
      sortBy: 'newest'
    });
  };
  
  const handleLoadMore = () => {
    fetchListings(true);
  };
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">Food Listings</h1>
            <p className="text-gray-600 text-lg">Discover delicious, fresh food items in your community</p>
          </div>
          
          <div className="flex space-x-3 items-center mt-6 md:mt-0">
            {userCity && (
              <motion.span 
                className="text-gray-700 flex items-center mr-2 bg-green-50 border border-green-100 px-4 py-2 rounded-full shadow-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <FiMapPin className="mr-2 text-green-500" /> {userCity}
              </motion.span>
            )}
            
           
          </div>
        </motion.div>
        
      
      
        
        {/* Error message */}
        {error && (
          <motion.div 
            className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-8 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </motion.div>
        )}
        
        {/* Initial loading state */}
        {loading && listings.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-green-100 border-t-green-500 rounded-full shadow-md"
            />
          </div>
        )}
        
        {/* No results */}
        {!loading && listings.length === 0 && (
          <motion.div 
            className="text-center py-16 bg-white rounded-2xl shadow-md border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(249,250,251,0.8) 100%)',
            }}
          >
            {/* Using a static image for empty state */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/empty-state.svg" alt="No results" className="w-48 h-48 mx-auto mb-6 opacity-80" />
            <h2 className="text-2xl font-bold text-gray-700 mb-3">No listings found</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">We couldn&apos;t find any listings matching your criteria. Try adjusting your search or filters.</p>
            <motion.button
              onClick={handleClearFilters}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all inline-flex items-center"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiX className="mr-2" /> Clear All Filters
            </motion.button>
          </motion.div>
        )}
        
        {/* Results */}
        {listings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {listings.map((listing) => (
                <motion.div 
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FoodCard
                    id={listing.id}
                    title={listing.title}
                    description={listing.description}
                    imageUrl={listing.imageUrl}
                    location={`${listing.location.city}, ${listing.location.state}`}
                    price={listing.price}
                    isDonation={listing.isDonation}
                    expiryDate={listing.expiryDate}
                  />
                </motion.div>
              ))}
            </div>
            
            {/* Load More */}
            {hasMore && (
              <div className="mt-12 flex justify-center">
                <motion.button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={`px-8 py-3.5 rounded-xl font-medium shadow-md ${
                    loading 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                  }`}
                  whileHover={loading ? {} : { y: -2 }}
                  whileTap={loading ? {} : { scale: 0.98 }}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full mr-3"
                      />
                      Loading...
                    </span>
                  ) : (
                    'Load More Listings'
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ListingsPage;
