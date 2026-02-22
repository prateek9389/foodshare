'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCalendar, FiDollarSign, FiTag, FiBox, FiArrowLeft, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import ImageUploader from '../../../../components/ImageUploader';
import Navbar from '../../../../components/Navbar';
import { FoodListingFormData } from '../../../../models/FoodListing';

// Food categories
const FOOD_CATEGORIES = [
  'Fruits & Vegetables',
  'Dairy & Eggs',
  'Bread & Bakery',
  'Meat & Seafood',
  'Pantry Items',
  'Snacks',
  'Beverages',
  'Ready-to-Eat',
  'Homemade',
  'Other'
];

const EditListingPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cloudinaryImages, setCloudinaryImages] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<FoodListingFormData>({
    title: '',
    description: '',
    images: [],
    price: null,
    isDonation: false,
    expiryDate: '',
    category: '',
    quantity: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    const fetchListing = async () => {
      if (!id || !user?.uid) return;
      
      try {
        setLoading(true);
        const listingDocRef = doc(db, 'foodListings', id as string);
        const listingDoc = await getDoc(listingDocRef);
        
        if (!listingDoc.exists()) {
          setError('Listing not found');
          setLoading(false);
          return;
        }
        
        const data = listingDoc.data();
        
        // Check if the current user is the owner of this listing
        if (data.userId !== user.uid) {
          setError('You do not have permission to edit this listing');
          setLoading(false);
          return;
        }
        
        // Format the date to YYYY-MM-DD format for the date input
        const expiryDate = data.expiryDate.toDate();
        const formattedDate = expiryDate.toISOString().split('T')[0];
        
        setFormData({
          title: data.title,
          description: data.description,
          images: [], // We'll set the images separately
          price: data.price,
          isDonation: data.isDonation,
          expiryDate: formattedDate,
          category: data.category,
          quantity: data.quantity
        });
        
        // Set the existing images
        if (data.imageUrls && data.imageUrls.length > 0) {
          setCloudinaryImages(data.imageUrls);
        } else if (data.imageUrl) {
          setCloudinaryImages([data.imageUrl]);
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchListing();
  }, [id, isAuthenticated, user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        // Reset price to null if it's a donation
        ...(name === 'isDonation' && checked ? { price: null } : {})
      }));
    } else if (name === 'price') {
      // Handle price as a number or null
      const priceValue = value ? parseFloat(value) : null;
      setFormData(prev => ({ ...prev, [name]: priceValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleImagesUploaded = (imageUrls: string[]) => {
    setCloudinaryImages(imageUrls);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      // Validations
      if (!formData.title || !formData.description || !formData.category || !formData.quantity || !formData.expiryDate) {
        throw new Error('Please fill in all required fields');
      }
      
      if (cloudinaryImages.length === 0) {
        throw new Error('Please upload at least one image of the food');
      }
      
      if (!user?.uid || !id) {
        throw new Error('User not authenticated or listing ID missing');
      }
      
      // Update listing in Firestore
      const listingData = {
        title: formData.title,
        description: formData.description,
        imageUrl: cloudinaryImages[0], // Primary image
        imageUrls: cloudinaryImages, // All images
        price: formData.isDonation ? null : formData.price,
        isDonation: formData.isDonation,
        expiryDate: new Date(formData.expiryDate),
        updatedAt: new Date(),
        category: formData.category,
        quantity: formData.quantity
      };
      
      const listingDocRef = doc(db, 'foodListings', id as string);
      await updateDoc(listingDocRef, listingData);
      
      setSuccess(true);
      
      // Redirect back to listings after success
      setTimeout(() => {
        router.push('/my-listings');
      }, 1500);
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update listing. Please try again.');
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
      <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link 
              href="/my-listings" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-green-600"
            >
              <FiArrowLeft className="mr-2" /> Back to My Listings
            </Link>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-8 rounded-xl shadow-md"
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Food Listing</h1>
            
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
                  <p className="text-sm text-green-700">Listing updated successfully!</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title*
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                  placeholder="E.g., Fresh Homemade Bread"
                />
              </div>
              
              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description*
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                  placeholder="Describe the food item, including details about preparation, storage, etc."
                />
              </div>
              
              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images*
                </label>
                <ImageUploader 
                  onImagesUploaded={handleImagesUploaded}
                  maxImages={5}
                  initialImages={cloudinaryImages}
                  disabled={saving}
                />
              </div>
              
              {/* Price and Donation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="isDonation" className="flex items-center">
                    <input
                      id="isDonation"
                      name="isDonation"
                      type="checkbox"
                      checked={formData.isDonation}
                      onChange={handleChange}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Offer as donation</span>
                  </label>
                </div>
                
                {!formData.isDonation && (
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiDollarSign className="text-gray-400" />
                      </div>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price === null ? '' : formData.price}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Category and Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiTag className="text-gray-400" />
                    </div>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select a category</option>
                      {FOOD_CATEGORIES.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiBox className="text-gray-400" />
                    </div>
                    <input
                      id="quantity"
                      name="quantity"
                      type="text"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                      placeholder="E.g., 2 loaves, 500g, etc."
                    />
                  </div>
                </div>
              </div>
              
              {/* Expiry Date */}
              <div>
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiCalendar className="text-gray-400" />
                  </div>
                  <input
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    value={typeof formData.expiryDate === 'string' ? formData.expiryDate : formData.expiryDate.toISOString().split('T')[0]}
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().split('T')[0]} // Today's date as minimum
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              
              {/* Submit and Cancel Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <Link
                  href="/my-listings"
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

export default EditListingPage;
