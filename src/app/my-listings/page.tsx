'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit, FiTrash2, FiPlus, FiAlertCircle, FiCheck, FiEye, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import Navbar from '../../components/Navbar';
import { FoodListing } from '../../models/FoodListing';

const MyListingsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchMyListings = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        const q = query(
          collection(db, 'foodListings'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedListings = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            expiryDate: data.expiryDate.toDate(),
            createdAt: data.createdAt.toDate()
          } as FoodListing;
        });

        setListings(fetchedListings);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError('Failed to fetch your listings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyListings();
  }, [isAuthenticated, user, router, deleteSuccess]);

  const openDeleteModal = (listingId: string) => {
    setDeleteTarget(listingId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      const listingDocRef = doc(db, 'foodListings', deleteTarget);
      await deleteDoc(listingDocRef);
      
      setDeleteSuccess(true);
      
      // Reset after success animation
      setTimeout(() => {
        setDeleteSuccess(false);
        closeDeleteModal();
      }, 1500);
    } catch (err) {
      console.error('Error deleting listing:', err);
      setError('Failed to delete the listing. Please try again.');
      setDeleteLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Check if food item is expired
  const isExpired = (expiryDate: Date) => {
    return new Date() > expiryDate;
  };

  // Get status label for food item
  const getStatusLabel = (listing: FoodListing) => {
    if (!listing.isAvailable) {
      return { text: 'Unavailable', color: 'bg-gray-100 text-gray-800' };
    }
    
    if (isExpired(listing.expiryDate)) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800' };
    }
    
    const today = new Date();
    const diffTime = listing.expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return { text: 'Expires Today', color: 'bg-orange-100 text-orange-800' };
    } else if (diffDays === 1) {
      return { text: 'Expires Tomorrow', color: 'bg-orange-100 text-orange-800' };
    } else if (diffDays <= 3) {
      return { text: `Expires in ${diffDays} days`, color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: 'Active', color: 'bg-green-100 text-green-800' };
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Food Listings</h1>
              <p className="text-gray-600 mt-1">Manage your food listings</p>
            </div>
            <Link
              href="/add-listing"
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              <FiPlus className="mr-2" /> Add New Listing
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
          ) : listings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="flex justify-center">
                <FiAlertCircle className="text-gray-400 text-5xl mb-4" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Listings Yet</h2>
              <p className="text-gray-600 mb-6">
                You haven&apos;t created any food listings yet. Start sharing your excess food with others!
              </p>
              <Link
                href="/add-listing"
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <FiPlus className="mr-2" /> Add Your First Listing
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Food Item
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Added
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {listings.map((listing) => {
                      const status = getStatusLabel(listing);
                      return (
                        <tr key={listing.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 relative">
                                <Image
                                  src={listing.imageUrl}
                                  alt={listing.title}
                                  fill
                                  className="rounded-md object-cover"
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{listing.title}</div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">{listing.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                              {status.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {listing.isDonation ? (
                              <span className="text-green-600 font-medium">Donation</span>
                            ) : (
                              <span>{listing.price ? `₹${listing.price}` : 'Free'}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(listing.expiryDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(listing.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Link 
                                href={`/listings/${listing.id}`}
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title="View"
                              >
                                <FiEye />
                              </Link>
                              <Link 
                                href={`/my-listings/edit/${listing.id}`}
                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                title="Edit"
                              >
                                <FiEdit />
                              </Link>
                              <button
                                onClick={() => openDeleteModal(listing.id)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Delete"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              {deleteSuccess ? (
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <FiCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-gray-900">Deleted Successfully</h3>
                  <p className="mt-2 text-gray-600">Your listing has been deleted.</p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <FiAlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-gray-900">Delete Listing</h3>
                    <p className="mt-2 text-gray-600">
                      Are you sure you want to delete this listing? This action cannot be undone.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeDeleteModal}
                      disabled={deleteLoading}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      disabled={deleteLoading}
                      className={`px-4 py-2 rounded-md text-white ${
                        deleteLoading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MyListingsPage;
