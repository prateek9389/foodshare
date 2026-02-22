'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiCreditCard, FiMapPin, FiAlertTriangle, FiArrowLeft, FiInfo } from 'react-icons/fi';
import { SiPhonepe, SiGooglepay } from 'react-icons/si';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import Navbar from '../../components/Navbar';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  userId: string;
  userName: string;
  createdAt: { seconds: number; nanoseconds: number } | Date;
  expiryDate: { seconds: number; nanoseconds: number } | Date;
  isAvailable: boolean;
  quantity: number;
  location: {
    address: string;
    city: string;
    state: string;
  };
  category: string;
  condition: string;
  isDonation: boolean;
}

interface CheckoutState {
  step: number;
  paymentMethod: 'cod' | 'upi' | 'card' | '';
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  processing: boolean;
  error: string;
  success: boolean;
  orderId: string;
}

// Client-side component that safely uses useSearchParams
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<CheckoutState>({
    step: 1, // 1: Shipping info, 2: Payment, 3: Confirmation
    paymentMethod: '',
    shippingAddress: {
      name: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: ''
    },
    processing: false,
    error: '',
    success: false,
    orderId: ''
  });

  // Format date
  const formatDate = (date: Date | { seconds: number; nanoseconds: number }): string => {
    if (!date) return 'Unknown';
    
    // Handle Firestore timestamp objects
    if (typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000).toLocaleDateString('en-US', {
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
    
    return 'Unknown';
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };
  
  // Fetch listing on page load
  useEffect(() => {
    const listingId = searchParams.get('listingId');
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (!listingId) {
      router.push('/listings');
      return;
    }
    
    const fetchListing = async () => {
      try {
        setLoading(true);
        // Ensure listingId is a string and not null/undefined
        const listingId = searchParams.get('listingId');
        if (!listingId) {
          setState(prev => ({ ...prev, error: 'Invalid listing ID' }));
          setLoading(false);
          return;
        }
        
        const listingRef = doc(db, 'foodListings', listingId);
        const listingSnap = await getDoc(listingRef);
        
        if (!listingSnap.exists()) {
          setState(prev => ({ ...prev, error: 'Listing not found' }));
          setLoading(false);
          return;
        }
        
        const listingData = listingSnap.data();
        
        // Check if item is still available
        if (!listingData.isAvailable) {
          setState(prev => ({ ...prev, error: 'This item is no longer available' }));
          setLoading(false);
          return;
        }
        
        // Check if user is trying to buy their own listing
        if (listingData.userId === user?.uid) {
          setState(prev => ({ ...prev, error: 'You cannot purchase your own listing' }));
          setLoading(false);
          return;
        }
        
        setListing({
          id: listingSnap.id,
          ...listingData,
          expiryDate: listingData.expiryDate,
          createdAt: listingData.createdAt
        } as Listing);
        
        // Pre-fill user info if available
        if (user && user.uid) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setState(prev => ({
              ...prev,
              shippingAddress: {
                name: userData.displayName || userData.name || '',
                phone: userData.phone || userData.mobileNumber || '',
                address: userData.address || '',
                city: userData.city || '',
                state: userData.state || '',
                pincode: userData.pincode || ''
              }
            }));
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching listing:', err);
        setState(prev => ({ ...prev, error: 'Failed to load listing details' }));
        setLoading(false);
      }
    };
    
    fetchListing();
  }, [isAuthenticated, router, searchParams, user]);
  
  // Handle shipping form submission
  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const { shippingAddress } = state;
    const { name, phone, address, city, state: stateValue, pincode } = shippingAddress;
    if (!name || !phone || !address || !city || !stateValue || !pincode) {
      setState(prev => ({ ...prev, error: 'Please fill all required fields' }));
      return;
    }
    
    if (phone.length < 10) {
      setState(prev => ({ ...prev, error: 'Please enter a valid phone number' }));
      return;
    }
    
    setState(prev => ({ ...prev, step: 2, error: '' }));
  };
  
  // Handle payment method selection
  const selectPaymentMethod = (method: 'cod' | 'upi' | 'card') => {
    setState(prev => ({ ...prev, paymentMethod: method }));
  };
  
  // Handle payment submission
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.paymentMethod) {
      setState(prev => ({ ...prev, error: 'Please select a payment method' }));
      return;
    }
    
    if (!listing || !user?.uid) return;
    
    try {
      setState(prev => ({ ...prev, processing: true, error: '' }));
      
      // Ensure listing ID is available and valid
      if (!listing.id || typeof listing.id !== 'string') {
        throw new Error('Invalid listing ID');
      }

      // Prepare order data
      const orderData = {
        buyerId: user.uid,
        buyerName: state.shippingAddress.name,
        buyerPhone: state.shippingAddress.phone,
        sellerId: listing.userId,
        sellerName: listing.userName,
        listingId: listing.id, // Required field per our security rules
        productTitle: listing.title,
        productImage: listing.imageUrl,
        totalAmount: listing.price || 0, // Required field per our security rules
        paymentMethod: state.paymentMethod,
        shippingAddress: state.shippingAddress, // Required field per our security rules
        orderStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        trackingInfo: {
          currentStatus: 'processing',
          history: [
            {
              status: 'ordered',
              timestamp: Timestamp.now(), // Using Timestamp.now() instead of serverTimestamp() in arrays
              message: 'Order placed successfully'
            }
          ],
          lastUpdated: serverTimestamp() // Using serverTimestamp() outside of arrays is fine
        },
        isDonation: listing.isDonation
      };
      
      // First, create the order - this should work with our existing rules
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      try {
        // Then try to update the listing - if this fails, the order is still created
        // which is better than no order at all
        await updateDoc(doc(db, 'foodListings', listing.id), {
          isAvailable: false,
          soldTo: user.uid,
          soldAt: serverTimestamp()
        });
      } catch (updateErr) {
        console.warn('Could not update listing availability, but order was created:', updateErr);
        // We'll continue anyway since the order is created
      }
      
      // Success! Go to confirmation page
      setState(prev => ({
        ...prev,
        processing: false,
        success: true,
        step: 3,
        orderId: orderRef.id
      }));
      
    } catch (err) {
      console.error('Payment processing error:', err);
      setState(prev => ({
        ...prev,
        processing: false,
        error: 'There was an error processing your payment. Please try again.'
      }));
    }
  };
  
  // Handle going back to previous step
  const goBack = () => {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: prev.step - 1, error: '' }));
    } else {
      router.back();
    }
  };
  
  // Render order summary
  const renderOrderSummary = () => {
    if (!listing) return null;
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Order Summary</h2>
        
        <div className="flex items-start mb-4">
          <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
            <div className="relative w-full h-full">
              <Image 
                src={listing.imageUrl} 
                alt={listing.title}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="font-medium text-gray-800">{listing.title}</h3>
            <p className="text-sm text-gray-500 mt-1">Expires on: {formatDate(listing.expiryDate)}</p>
            {listing.isDonation ? (
              <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Donation</span>
            ) : (
              <p className="text-lg font-bold text-gray-900 mt-2">{formatCurrency(listing.price)}</p>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Item price</span>
            <span className="font-medium">{listing.isDonation ? 'Donation' : formatCurrency(listing.price)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Shipping</span>
            <span className="font-medium">Free</span>
          </div>
          {!listing.isDonation && (
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
              <span>Total</span>
              <span>{formatCurrency(listing.price)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render shipping form
  const renderShippingForm = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Shipping Information</h2>
        
        <form onSubmit={handleShippingSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={state.shippingAddress.name}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  shippingAddress: {
                    ...prev.shippingAddress,
                    name: e.target.value
                  }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={state.shippingAddress.phone}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  shippingAddress: {
                    ...prev.shippingAddress,
                    phone: e.target.value
                  }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <textarea
                id="address"
                name="address"
                value={state.shippingAddress.address}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  shippingAddress: {
                    ...prev.shippingAddress,
                    address: e.target.value
                  }
                }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={state.shippingAddress.city}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    shippingAddress: {
                      ...prev.shippingAddress,
                      city: e.target.value
                    }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={state.shippingAddress.state}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    shippingAddress: {
                      ...prev.shippingAddress,
                      state: e.target.value
                    }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">PIN Code *</label>
                <input
                  type="text"
                  id="pincode"
                  name="pincode"
                  value={state.shippingAddress.pincode}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    shippingAddress: {
                      ...prev.shippingAddress,
                      pincode: e.target.value
                    }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Continue to Payment
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  // Render payment form
  const renderPaymentForm = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Payment Method</h2>
        
        <form onSubmit={handlePaymentSubmit}>
          <div className="space-y-4">
            {/* Cash on Delivery */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer ${state.paymentMethod === 'cod' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`} 
              onClick={() => selectPaymentMethod('cod')}
            >
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${state.paymentMethod === 'cod' ? 'border-green-500' : 'border-gray-300'}`}>
                  {state.paymentMethod === 'cod' && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
                </div>
                <span className="ml-3 font-medium">Cash on Delivery</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Pay with cash when your order is delivered</p>
            </div>
            
            {/* UPI Payment */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer ${state.paymentMethod === 'upi' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`} 
              onClick={() => selectPaymentMethod('upi')}
            >
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${state.paymentMethod === 'upi' ? 'border-green-500' : 'border-gray-300'}`}>
                  {state.paymentMethod === 'upi' && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
                </div>
                <span className="ml-3 font-medium">UPI Payment</span>
                <div className="ml-auto flex items-center space-x-2">
                  <SiPhonepe className="text-purple-600" size={24} />
                  <SiGooglepay className="text-blue-600" size={24} />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Pay using PhonePe, Google Pay, or other UPI apps</p>
            </div>
            
            {/* Credit/Debit Card */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer ${state.paymentMethod === 'card' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`} 
              onClick={() => selectPaymentMethod('card')}
            >
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${state.paymentMethod === 'card' ? 'border-green-500' : 'border-gray-300'}`}>
                  {state.paymentMethod === 'card' && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
                </div>
                <span className="ml-3 font-medium">Credit / Debit Card</span>
                <FiCreditCard className="ml-auto text-gray-600" size={24} />
              </div>
              <p className="text-sm text-gray-500 mt-2">Pay securely with your credit or debit card</p>
            </div>
          </div>
          
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            
            <button
              type="submit"
              disabled={state.processing || !state.paymentMethod}
              className={`px-6 py-2 bg-green-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                state.processing || !state.paymentMethod 
                  ? 'opacity-70 cursor-not-allowed' 
                  : 'hover:bg-green-700'
              }`}
            >
              {state.processing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Place Order'
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  // Render animated thank you card with order confirmation
  const renderOrderConfirmation = () => {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center overflow-hidden relative">
        {/* Animated confetti background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div 
                key={i} 
                className={`confetti bg-${['green', 'blue', 'yellow', 'red', 'purple', 'pink'][i % 6]}-${[300, 400, 500, 600][i % 4]}`}
                style={{
                  left: `${Math.random() * 100}%`,
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${Math.random() * 3 + 2}s`
                }}
              />
            ))}
          </div>
        </div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20, 
              delay: 0.2 
            }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md"
          >
            <FiCheckCircle className="text-green-600 text-5xl" />
          </motion.div>
          
          <motion.h2 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl font-bold text-gray-800 mb-2"
          >
            Thank You For Your Order!
          </motion.h2>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-gray-600 mb-6"
          >
            Your order has been placed successfully and will be processed soon.
          </motion.p>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-gray-50 p-4 rounded-lg mb-6 shadow-inner"
          >
            <p className="text-sm text-gray-500 mb-1">Order ID:</p>
            <p className="font-mono font-medium">{state.orderId}</p>
          </motion.div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col gap-4 mt-8"
          >
            <Link href={`/orders/${state.orderId}`} className="text-center">
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-all"
              >
                View Order Details
              </motion.button>
            </Link>
            
            <Link href="/orders" className="text-center">
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                View All Orders
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  };
  
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Checkout Header */}
          <div className="mb-8">
            <button 
              onClick={goBack}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <FiArrowLeft className="mr-2" /> Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{listing?.isDonation ? 'Claim Donation' : 'Checkout'}</h1>
          </div>
          
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex flex-col items-center justify-center h-60">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                <p className="mt-4 text-gray-600">Loading checkout...</p>
              </div>
            </div>
          ) : state.error ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <FiAlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Checkout Error</h3>
                <p className="text-gray-600 mb-6">{state.error}</p>
                <Link href="/listings">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Browse Listings
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {/* Left Column - Form Steps */}
              <div className="md:col-span-3 space-y-6">
                {/* Progress Steps */}
                <div className="flex items-center mb-8">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${state.step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    <FiMapPin size={16} />
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${state.step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${state.step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    <FiCreditCard size={16} />
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${state.step >= 3 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${state.step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    <FiCheckCircle size={16} />
                  </div>
                </div>
                
                {/* Form Steps */}
                {state.step === 1 && renderShippingForm()}
                {state.step === 2 && renderPaymentForm()}
                {state.step === 3 && renderOrderConfirmation()}
              </div>
              
              {/* Right Column - Order Summary */}
              <div className="md:col-span-2">
                {renderOrderSummary()}
                
                {/* Need Help */}
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center">
                    <FiInfo className="text-gray-500 mr-3" size={20} />
                    <p className="text-sm text-gray-600">Need help with your order?</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Contact our customer support team at support@foodshare.in or call +91 98765 43210.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Wrap the CheckoutContent component with a Suspense boundary
const CheckoutPage = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>Loading checkout...</p></div>}>
      <CheckoutContent />
    </Suspense>
  );
};

export default CheckoutPage;
