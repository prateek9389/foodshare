'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { FiShoppingBag, FiClock, FiCheckCircle, FiX, FiTruck, FiAlertTriangle, FiArrowLeft, FiMapPin, FiUser, FiPhone, FiMail, FiMessageSquare, FiDownload, FiPrinter } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import Navbar from '../../../components/Navbar';

interface Order {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  sellerEmail?: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  amount: number;
  totalAmount?: number; // Added for new orders format
  orderDate: { seconds: number; nanoseconds: number };
  createdAt?: { seconds: number; nanoseconds: number }; // Added for new orders format
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  orderStatus?: string; // Added for new orders format
  trackingInfo: {
    currentStatus: string;
    trackingNumber?: string;
    courierName?: string;
    estimatedDelivery?: { seconds: number; nanoseconds: number };
    history: {
      status: string;
      timestamp: { seconds: number; nanoseconds: number };
      message: string;
    }[];
  };
  paymentMethod: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  isDonation: boolean;
}

const OrderDetailPage = () => {
  // Use useParams() for client components in App Router
  const params = useParams();
 
  // Get the order ID from params and ensure it's a string
  const orderId = params?.id as string;
  const router = useRouter();
  const { user, isAuthenticated} = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [sellerDetails, setSellerDetails] = useState<{
    name: string;
    email: string;
    phone: string;
    accountType?: string;
  } | null>(null);
  
  // Format date
  const formatDate = (date: { seconds: number; nanoseconds: number } | null | undefined): string => {
    if (!date || !date.seconds) return 'Not available';
    
    return new Date(date.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Format time
  const formatTime = (date: { seconds: number; nanoseconds: number } | null | undefined): string => {
    if (!date || !date.seconds) return '';
    
    return new Date(date.seconds * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };
  
  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <FiClock /> };
      case 'processing':
        return { color: 'bg-blue-100 text-blue-800', icon: <FiClock /> };
      case 'shipped':
        return { color: 'bg-indigo-100 text-indigo-800', icon: <FiTruck /> };
      case 'delivered':
        return { color: 'bg-green-100 text-green-800', icon: <FiCheckCircle /> };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: <FiX /> };
      case 'ordered':
        return { color: 'bg-purple-100 text-purple-800', icon: <FiShoppingBag /> };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <FiClock /> };
    }
  };
  
  // Check if user can cancel the order
  const canCancelOrder = () => {
    if (!order || !user) return false;
    
    // Check if user is the buyer
    if (order.buyerId !== user.uid) return false;
    
    // Check if order is already cancelled or delivered
    if (['cancelled', 'delivered'].includes(order.status)) return false;
    
    return true;
  };
  
  // Fetch order details
  useEffect(() => {
    // Only redirect if user is definitely not authenticated
    if (isAuthenticated === false) {
      console.log('Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }
    
    // Wait for user data before trying to fetch order details
    if (!user) {
      return;
    }
    
    const fetchOrderDetails = async () => {
      if (!user?.uid || !orderId) return;
      
      try {
        setLoading(true);
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        
        if (!orderSnap.exists()) {
          setError('Order not found.');
          setLoading(false);
          return;
        }
        
        const orderData = orderSnap.data();
        
        // Ensure user has permission to view this order
        if (orderData.buyerId !== user.uid && orderData.sellerId !== user.uid) {
          setError('You do not have permission to view this order.');
          setLoading(false);
          return;
        }
        
        // Set order data
        setOrder({
          id: orderSnap.id,
          ...orderData
        } as Order);
        
        // Get seller details
        if (orderData.sellerId) {
          const sellerRef = doc(db, 'users', orderData.sellerId);
          const sellerSnap = await getDoc(sellerRef);
          
          if (sellerSnap.exists()) {
            const sellerData = sellerSnap.data();
            setSellerDetails({
              name: sellerData.displayName || sellerData.name || orderData.sellerName,
              email: sellerData.email || '',
              phone: sellerData.phone || sellerData.mobileNumber || '',
              accountType: sellerData.accountType || 'Individual'
            });
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Failed to load order details. Please try again.');
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [isAuthenticated, router, params, orderId, user]);
  
  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!order || !user?.uid) return;
    
    if (cancellationReason.trim() === '') {
      setError('Please provide a reason for cancellation.');
      return;
    }
    
    try {
      setIsCancelling(true);
      
      // Update order status
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'cancelled',
        'trackingInfo.currentStatus': 'cancelled',
        'trackingInfo.history': arrayUnion({
          status: 'cancelled',
          timestamp: serverTimestamp(),
          message: `Order cancelled by the buyer. Reason: ${cancellationReason}`
        }),
        updatedAt: serverTimestamp()
      });
      
      // Make listing available again
      const listingRef = doc(db, 'foodListings', order.productId);
      await updateDoc(listingRef, {
        isAvailable: true,
        soldTo: null,
        soldAt: null
      });
      
      // Update local state
      setOrder({
        ...order,
        status: 'cancelled',
        trackingInfo: {
          ...order.trackingInfo,
          currentStatus: 'cancelled',
          history: [
            ...order.trackingInfo.history,
            {
              status: 'cancelled',
              timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
              message: `Order cancelled by the buyer. Reason: ${cancellationReason}`
            }
          ]
        }
      });
      
      setCancelModalOpen(false);
      setIsCancelling(false);
      
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError('Failed to cancel the order. Please try again.');
      setIsCancelling(false);
    }
  };
  
  // Render cancel modal
  const renderCancelModal = () => {
    if (!cancelModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Cancel Order</h3>
          <p className="text-gray-600 mb-4">Are you sure you want to cancel this order? This action cannot be undone.</p>
          
          <div className="mb-4">
            <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for cancellation *
            </label>
            <textarea
              id="cancellationReason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="Please tell us why you're cancelling this order..."
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling || cancellationReason.trim() === ''}
              className={`px-4 py-2 bg-red-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                isCancelling || cancellationReason.trim() === '' 
                  ? 'opacity-70 cursor-not-allowed' 
                  : 'hover:bg-red-700'
              }`}
            >
              {isCancelling ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Confirm Cancellation'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render tracking history
  const renderTrackingHistory = () => {
    if (!order || !order.trackingInfo || !order.trackingInfo.history) return null;
    
    return (
      <div className="mt-8">
        <h3 className="font-semibold text-gray-900 mb-4">Order Timeline</h3>
        <div className="border-l-2 border-green-500 ml-3 pb-6 space-y-6">
          {order.trackingInfo.history.map((event, index) => (
            <div key={index} className="relative">
              <div className="absolute -left-3 mt-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-white">
                <div className={`w-4 h-4 rounded-full ${getStatusInfo(event.status).color.replace('text-', 'bg-').replace('-100', '-500')}`}></div>
              </div>
              <div className="ml-6">
                <p className="font-medium text-gray-900 capitalize">{event.status}</p>
                <p className="text-sm text-gray-600">{event.message}</p>
                <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)} at {formatTime(event.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Start a conversation with the seller
  const contactSeller = async () => {
    if (!user?.uid || !order) return;
    
    try {
      // Check if a conversation already exists
      const { sellerId } = order;
      router.push(`/messages?recipient=${sellerId}`);
    } catch (err) {
      console.error('Error starting conversation:', err);
      setError('Failed to start conversation. Please try again.');
    }
  };
  
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Order Header */}
          <div className="mb-8">
            <Link href="/orders">
              <button className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
                <FiArrowLeft className="mr-2" /> Back to Orders
              </button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600 mt-1">Order #{orderId.slice(-8)}</p>
          </div>
          
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex flex-col items-center justify-center h-60">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                <p className="mt-4 text-gray-600">Loading order details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <FiAlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <Link href="/orders">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Back to Orders
                  </button>
                </Link>
              </div>
            </div>
          ) : !order ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <FiAlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Order Not Found</h3>
                <div className="text-center text-gray-600">It looks like you&apos;re viewing someone else&apos;s order, or the order doesn&apos;t exist.</div>
                <p className="text-gray-600 mb-6">You do not have permission to view it.</p>
                <Link href="/orders">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Back to Orders
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Order Status Banner */}
              <div className={`mb-6 rounded-xl p-6 flex items-center ${
                order.status === 'cancelled' 
                  ? 'bg-red-50' 
                  : order.status === 'delivered' 
                    ? 'bg-green-50' 
                    : 'bg-blue-50'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  order.status === 'cancelled' 
                    ? 'bg-red-100 text-red-600' 
                    : order.status === 'delivered' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-blue-100 text-blue-600'
                }`}>
                  {order.status === 'cancelled' 
                    ? <FiX size={24} /> 
                    : order.status === 'delivered' 
                      ? <FiCheckCircle size={24} />
                      : <FiTruck size={24} />
                  }
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold capitalize">
                    {order.status === 'cancelled' 
                      ? 'Order Cancelled' 
                      : order.status === 'delivered' 
                        ? 'Order Delivered' 
                        : `Order ${order.status}`
                    }
                  </h2>
                  <p className={`${
                    order.status === 'cancelled' 
                      ? 'text-red-600' 
                      : order.status === 'delivered' 
                        ? 'text-green-600' 
                        : 'text-blue-600'
                  }`}>
                    {order.status === 'cancelled' 
                      ? 'This order has been cancelled and will not be processed further.' 
                      : order.status === 'delivered' 
                        ? 'Your order has been delivered successfully.' 
                        : order.status === 'shipped'
                          ? 'Your order is on the way.'
                          : 'Your order is being processed.'
                    }
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Order Info */}
                <div className="md:col-span-2 space-y-6">
                  {/* Product Info */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Product Information</h2>
                    
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                        <div className="relative w-full h-full">
                          <Image 
                            src={order.productImage} 
                            alt={order.productTitle}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{order.productTitle}</h3>
                        {order.isDonation ? (
                          <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Donation</span>
                        ) : (
                          <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(order.totalAmount || order.amount || 0)}</p>
                        )}
                        
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Order Date: {formatDate(order.createdAt || order.orderDate)}</p>
                          <p className="mt-1">Payment Method: {(order.paymentMethod || 'N/A').toUpperCase()}</p>
                        </div>
                        
                        <div className="mt-3">
                          <Link href={`/listings/${order.productId}`}>
                            <span className="text-sm text-blue-600 hover:underline">View Listing</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shipping Info */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Shipping Information</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                          <FiMapPin className="mr-2 text-gray-500" /> Delivery Address
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>{order.shippingAddress.name}</p>
                          <p>{order.shippingAddress.address}</p>
                          <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                          <p>Phone: {order.shippingAddress.phone}</p>
                        </div>
                      </div>
                      
                      {order.trackingInfo?.trackingNumber && (
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                            <FiTruck className="mr-2 text-gray-500" /> Tracking Information
                          </h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Tracking #: {order.trackingInfo.trackingNumber}</p>
                            {order.trackingInfo.courierName && (
                              <p>Courier: {order.trackingInfo.courierName}</p>
                            )}
                            {order.trackingInfo.estimatedDelivery && (
                              <p>Estimated Delivery: {formatDate(order.trackingInfo.estimatedDelivery)}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Tracking History */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Order Tracking</h2>
                    {renderTrackingHistory()}
                  </div>
                </div>
                
                {/* Right Column - Actions & Seller Info */}
                <div className="space-y-6">
                  {/* Order Actions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Order Actions</h2>
                    
                    <div className="space-y-3">
                      {/* Order Receipt Button */}
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                        <FiDownload className="mr-2" /> Download Receipt
                      </button>
                      
                      {/* Print Receipt Button */}
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                        <FiPrinter className="mr-2" /> Print Receipt
                      </button>
                      
                      {/* Cancel Order Button */}
                      {canCancelOrder() && (
                        <button 
                          onClick={() => setCancelModalOpen(true)}
                          className="w-full flex items-center justify-center px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                        >
                          <FiX className="mr-2" /> Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Seller Information */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Seller Information</h2>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <FiUser className="text-gray-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-800">{order.sellerName}</span>
                      </div>
                      
                      {sellerDetails?.email && (
                        <div className="flex items-center">
                          <FiMail className="text-gray-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-800">{sellerDetails.email}</span>
                        </div>
                      )}
                      
                      {sellerDetails?.phone && (
                        <div className="flex items-center">
                          <FiPhone className="text-gray-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-800">{sellerDetails.phone}</span>
                        </div>
                      )}
                      
                      {sellerDetails?.accountType && (
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            {sellerDetails.accountType}
                          </span>
                        </div>
                      )}
                      
                      <div className="pt-3 mt-3 border-t border-gray-100">
                        <button 
                          onClick={contactSeller}
                          className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          <FiMessageSquare className="mr-2" /> Contact Seller
                        </button>
                      </div>
                      
                      <div>
                        <Link href={`/seller-profile/${order.sellerId}`}>
                          <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                            View Seller Profile
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Cancel Order Modal */}
      {renderCancelModal()}
    </>
  );
};

export default OrderDetailPage;
