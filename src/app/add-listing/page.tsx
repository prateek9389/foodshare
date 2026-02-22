'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiCalendar, FiBox, FiInfo, FiAlertTriangle, FiDollarSign, FiTag, FiHeart } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import ImageUploader from '../../components/ImageUploader';
import Navbar from '../../components/Navbar';
import { FoodListingFormData } from '../../models/FoodListing';

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

const AddListingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cloudinaryImages, setCloudinaryImages] = useState<string[]>([]);
  
  // Define a type for user data
  interface UserData {
    displayName?: string;
    city?: string;
    state?: string;
    email?: string;
    photoURL?: string;
    phone?: string;
    [key: string]: string | number | boolean | undefined; // For any additional fields
  }
  
  const [userData, setUserData] = useState<UserData | null>(null);
  
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
    // Redirect to login if not authenticated
    if (!isAuthenticated && !user) {
      router.push('/login');
      return;
    }
    
    // Fetch user data to get location information
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            // User profile not complete, redirect to profile setup
            router.push('/profile/setup');
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      }
    };
    
    fetchUserData();
  }, [isAuthenticated, user, router]);
  
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
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Validations
      if (!formData.title || !formData.description || !formData.category || !formData.quantity || !formData.expiryDate) {
        throw new Error('Please fill in all required fields');
      }
      
      if (cloudinaryImages.length === 0) {
        throw new Error('Please upload at least one image of the food');
      }
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }
      
      if (!userData || !userData.city || !userData.state) {
        throw new Error('Please complete your profile with location information');
      }
      
      // Create listing in Firestore
      const listingData = {
        title: formData.title,
        description: formData.description,
        imageUrl: cloudinaryImages[0], // Primary image
        imageUrls: cloudinaryImages, // All images
        price: formData.isDonation ? null : formData.price,
        isDonation: formData.isDonation,
        expiryDate: new Date(formData.expiryDate),
        createdAt: new Date(),
        location: {
          address: userData.address || '',
          city: userData.city,
          state: userData.state,
          // Add coordinates if available
        },
        userId: user.uid,
        userName: userData.displayName || user.displayName,
        userPhotoUrl: user.photoURL,
        userContact: userData.mobileNumber,
        category: formData.category,
        quantity: formData.quantity,
        isAvailable: true
      };
      
      const docRef = await addDoc(collection(db, 'foodListings'), listingData);
      
      setSuccess(true);
      
      // Redirect to listing page after success
      setTimeout(() => {
        router.push(`/listings/${docRef.id}`);
      }, 2000);
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Success animation variants
  const successVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };
  
  if (success) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <motion.div
            variants={successVariants}
            initial="hidden"
            animate="visible"
            className="max-w-md w-full bg-white p-10 rounded-xl shadow-lg text-center"
          >
            <FiHeart className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Listing Added Successfully!</h2>
            <p className="mt-2 text-gray-600">
              Your food listing has been successfully added. Redirecting to your listing...
            </p>
          </motion.div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <Navbar />
      <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-8 rounded-xl shadow-md"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Add Food Listing</h1>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <div className="flex">
                  <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-sm text-red-700">{error}</p>
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
                  className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
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
                  className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
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
                  disabled={isLoading}
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
                        className="w-full pl-10 text-black pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
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
                      className="w-full pl-10 text-black pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
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
                      className="w-full text-black pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
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
              
              {/* Location Information (Read-only) */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FiInfo className="mr-2" /> Listing Location
                </h3>
                <p className="text-sm text-gray-600">
                  Your food listing will use your profile location: 
                  <span className="font-medium"> {userData?.city || 'City'}, {userData?.state || 'State'}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  To change this, please update your profile information.
                </p>
              </div>
              
              {/* Submit Button */}
              <div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white 
                    ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'}`}
                >
                  {isLoading ? 'Creating Listing...' : 'Create Listing'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default AddListingPage;
