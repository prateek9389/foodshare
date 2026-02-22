'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiClipboard, FiClock, FiCheckCircle, FiX, FiTruck, FiSearch, FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import Navbar from '../../components/Navbar';

interface Order {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  amount: number;
  orderDate: { seconds: number; nanoseconds: number };
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingInfo: {
    currentStatus: string;
    history: {
      status: string;
      timestamp: { seconds: number; nanoseconds: number };
      message: string;
    }[];
  };
  paymentMethod: string;
  isDonation: boolean;
}

const OrdersPage = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Format date
  const formatDate = (date: { seconds: number; nanoseconds: number }): string => {
    if (!date || !date.seconds) return 'Unknown';
    
    return new Date(date.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
        return { color: 'bg-blue-100 text-blue-800', icon: <FiClipboard /> };
      case 'shipped':
        return { color: 'bg-indigo-100 text-indigo-800', icon: <FiTruck /> };
      case 'delivered':
        return { color: 'bg-green-100 text-green-800', icon: <FiCheckCircle /> };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: <FiX /> };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <FiClock /> };
    }
  };
  
  // Fetch orders
  useEffect(() => {
    // Only redirect if we're certain the user isn't authenticated (after auth check is complete)
    if (isAuthenticated === false) {
      console.log('Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }
    
    const fetchOrders = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        
        // Fetch orders where user is buyer or seller
        const buyerOrdersQuery = query(
          collection(db, 'orders'),
          where('buyerId', '==', user.uid),
          orderBy('orderDate', 'desc')
        );
        
        const sellerOrdersQuery = query(
          collection(db, 'orders'),
          where('sellerId', '==', user.uid),
          orderBy('orderDate', 'desc')
        );
        
        const [buyerOrdersSnapshot, sellerOrdersSnapshot] = await Promise.all([
          getDocs(buyerOrdersQuery),
          getDocs(sellerOrdersQuery)
        ]);
        
        // Combine buyer and seller orders (removing duplicates)
        const orderMap = new Map();
        
        [...buyerOrdersSnapshot.docs, ...sellerOrdersSnapshot.docs].forEach(doc => {
          if (!orderMap.has(doc.id)) {
            orderMap.set(doc.id, {
              id: doc.id,
              ...doc.data()
            });
          }
        });
        
        const allOrders = Array.from(orderMap.values()) as Order[];
        setOrders(allOrders);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [isAuthenticated, router, user?.uid]);
  
  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Apply status filter
    if (filter === 'active' && ['cancelled', 'delivered'].includes(order.status)) {
      return false;
    }
    if (filter === 'completed' && order.status !== 'delivered') {
      return false;
    }
    if (filter === 'cancelled' && order.status !== 'cancelled') {
      return false;
    }
    
    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        order.productTitle.toLowerCase().includes(query) ||
        order.sellerName.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link href="/dashboard">
                <button className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2">
                  <FiArrowLeft className="mr-2" /> Back to Dashboard
                </button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600 mt-1">Track and manage your orders</p>
            </div>
          </div>
          
          {/* Filters and Search */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  className={`px-4 py-2 rounded-md text-sm ${filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setFilter('all')}
                >
                  All Orders
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm ${filter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setFilter('active')}
                >
                  Active
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm ${filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setFilter('completed')}
                >
                  Completed
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm ${filter === 'cancelled' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setFilter('cancelled')}
                >
                  Cancelled
                </button>
              </div>
              
              <div className="relative w-full md:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex flex-col items-center justify-center h-60">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <FiAlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Orders</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <FiShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              {searchQuery ? (
                <p className="text-gray-600 mb-6">No orders match your search criteria.</p>
              ) : (
                <p className="text-gray-600 mb-6">You haven&apos;t placed or received any orders yet.</p>
              )}
              <Link href="/listings">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Browse Listings
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                        <div className="relative w-full h-full">
                          <Image
                            src={order.productImage}
                            alt={order.productTitle}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      </div>
                      
                      {/* Order Details */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{order.productTitle}</h3>
                            <p className="text-sm text-gray-500">Order #{order.id.slice(-8)}</p>
                          </div>
                          <div className="mt-2 sm:mt-0">
                            {order.isDonation ? (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Donation</span>
                            ) : (
                              <span className="font-medium text-gray-900">{formatCurrency(order.amount)}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center text-sm text-gray-500">
                            <FiClock className="mr-1" size={14} />
                            <span>Ordered on {formatDate(order.orderDate)}</span>
                          </div>
                          
                          <div className="mt-2 sm:mt-0 flex items-center">
                            <span className={`flex items-center text-xs px-2 py-1 rounded-full ${getStatusInfo(order.status).color}`}>
                              {getStatusInfo(order.status).icon}
                              <span className="ml-1 capitalize">{order.status}</span>
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm">
                          {order.buyerId === user?.uid ? (
                            <p className="text-gray-600">Seller: {order.sellerName}</p>
                          ) : (
                            <p className="text-gray-600">You sold this item</p>
                          )}
                        </div>
                      </div>
                      
                      {/* View Details Arrow */}
                      <div className="hidden sm:flex items-center self-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OrdersPage;
