'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiHeart, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import Navbar from '../../components/Navbar';
import FoodCard from '../../components/FoodCard';
import { FoodListing } from '../../models/FoodListing';

const SavedItemsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [savedListings, setSavedListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchSavedItems = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        
        // First, get all items from wishlist
        const wishlistQuery = query(
          collection(db, 'wishlist'),
          where('userId', '==', user.uid)
        );
        
        const wishlistSnapshot = await getDocs(wishlistQuery);
        
        if (wishlistSnapshot.empty) {
          setSavedListings([]);
          setLoading(false);
          return;
        }
        
        // Get all listing IDs from wishlist
        const listingIds = wishlistSnapshot.docs.map(doc => doc.data().listingId);
        
        // Now fetch all the actual listings
        const fetchPromises = listingIds.map(async (id) => {
          const listingDoc = await doc(db, 'foodListings', id);
          const listingSnapshot = await getDoc(listingDoc);
          
          if (listingSnapshot.exists()) {
            const data = listingSnapshot.data();
            return {
              id: listingSnapshot.id,
              ...data,
              expiryDate: data.expiryDate.toDate(),
              createdAt: data.createdAt.toDate(),
              // Add wishlistId for easy removal
              wishlistId: wishlistSnapshot.docs.find(doc => doc.data().listingId === id)?.id
            } as FoodListing & { wishlistId?: string };
          }
          
          return null;
        });
        
        const fetchedListings = await Promise.all(fetchPromises);
        
        // Filter out any null results (listings that may have been deleted)
        setSavedListings(fetchedListings.filter(Boolean) as FoodListing[]);
      } catch (err) {
        console.error('Error fetching saved items:', err);
        setError('Failed to fetch your saved items. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedItems();
  }, [isAuthenticated, user, router]);

  const removeFromWishlist = async (listingId: string, wishlistId?: string) => {
    if (!user?.uid) return;
    
    try {
      if (wishlistId) {
        // If we have the wishlist document ID
        await deleteDoc(doc(db, 'wishlist', wishlistId));
      } else {
        // Otherwise use composite ID (fallback)
        await deleteDoc(doc(db, 'wishlist', `${user.uid}_${listingId}`));
      }
      
      // Update UI
      setSavedListings(prev => prev.filter(item => item.id !== listingId));
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      setError('Failed to remove item from wishlist.');
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Saved Items</h1>
              <p className="text-gray-600 mt-1">Food listings you&apos;ve saved for later</p>
            </div>
            <Link
              href="/listings"
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Browse More Listings
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : savedListings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="flex justify-center">
                <FiHeart className="text-gray-400 text-5xl mb-4" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Saved Items</h2>
              <p className="text-gray-600 mb-6">
                You haven&apos;t saved any food listings yet. Browse listings and click the heart icon to save items.
              </p>
              <Link
                href="/listings"
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                Browse Listings
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {savedListings.map((listing) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
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
                  <button 
                    onClick={() => removeFromWishlist(listing.id, 'wishlistId' in listing && typeof listing.wishlistId === 'string' ? listing.wishlistId : undefined)}
                    className="absolute top-3 right-3 bg-white bg-opacity-90 p-2 rounded-full shadow-md hover:bg-red-100 transition-colors"
                    title="Remove from saved items"
                  >
                    <FiHeart className="text-red-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SavedItemsPage;
