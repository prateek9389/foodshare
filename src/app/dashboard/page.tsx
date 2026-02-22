'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiDollarSign, FiUsers, FiTrendingUp, FiArrowLeft, FiPackage, FiClock, FiHeart, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import Navbar from '../../components/Navbar';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  userId: string;
  createdAt: { seconds: number; nanoseconds: number } | Date;
  isAvailable: boolean;
  viewCount: number;
  soldCount?: number;
  sold?: boolean;
  likeCount?: number;
}

interface Order {
  id: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  listingId: string;
  productTitle: string;
  productImage?: string;
  totalAmount: number;
  orderDate?: { seconds: number; nanoseconds: number };
  createdAt?: { seconds: number; nanoseconds: number };
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingInfo?: {
    currentStatus: string;
    history: Array<{
      status: string;
      timestamp: { seconds: number; nanoseconds: number };
      message: string;
    }>;
  };
  isDonation: boolean;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

// ImageWrapper component for proper positioning of the Next.js Image component
const ImageWrapper = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
  return (
    <div className="relative w-full h-full">
      <Image 
        src={src} 
        alt={alt} 
        className={className || "object-cover"}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};

// Helper functions


const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'processing':
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'pending':
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'individual' | 'business' | 'ngo' | undefined>(undefined);
  const [listings, setListings] = useState<Listing[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<Listing[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  
  // Sample analytics data (in a real app, would be calculated from actual data)
  const viewsData = {
    daily: [25, 40, 30, 35, 55, 42, 48], // Last 7 days
    weekly: [120, 145, 165, 180] // Last 4 weeks
  };
  
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
    totalLikes: 0,
    totalRevenue: 0,
    averagePrice: 0,
    peopleImpacted: 0,
    recentSoldItems: 0,
    totalOrders: 0
  });

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const handleError = (error: Error | unknown) => {
    console.error('Error in dashboard:', error);
    setError(error instanceof Error ? error.message : 'An unknown error occurred');
    setLoading(false);
  };

  // Define fetchUserData using useCallback to avoid dependency issues
  const fetchUserData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      // Fetch user profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setError('User profile not found');
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      setAccountType(userData.accountType);
      
      // Fetch user listings
      const listingsQuery = query(collection(db, 'listings'), where('userId', '==', user.uid));
      const listingsSnapshot = await getDocs(listingsQuery);
      const listingsData = listingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[];
      
      setListings(listingsData);
      
      // Calculate basic stats
      const activeListings = listingsData.filter(listing => listing.isAvailable).length;
      const totalViews = listingsData.reduce((sum, listing) => sum + (listing.viewCount || 0), 0);
      const totalRevenue = listingsData.reduce((sum, listing) => sum + (listing.sold ? listing.price : 0), 0);
      const recentSoldItems = listingsData.filter(listing => listing.sold).length;
      const peopleImpacted = listingsData.reduce((sum, listing) => sum + (listing.soldCount || 0), 0) * 2; // Estimation
      const totalLikes = 0; // Placeholder value
      const averagePrice = listingsData.length > 0 ? totalRevenue / listingsData.length : 0;
      
      setStats({
        totalListings: listingsData.length,
        activeListings,
        totalViews,
        totalLikes,
        totalRevenue,
        averagePrice,
        recentSoldItems,
        peopleImpacted,
        totalOrders: recentSoldItems
      });
      
      // Get top selling products
      const sortedBySold = [...listingsData].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
      setTopSellingProducts(sortedBySold.slice(0, 5));
      
      // Fetch orders as a seller
      const sellingOrdersQuery = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
      const sellingOrdersSnapshot = await getDocs(sellingOrdersQuery);
      const sellingOrdersData = sellingOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Fetch orders as a buyer
      const buyingOrdersQuery = query(collection(db, 'orders'), where('buyerId', '==', user.uid));
      const buyingOrdersSnapshot = await getDocs(buyingOrdersQuery);
      const buyingOrdersData = buyingOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Combine and sort all orders
      const allOrdersData = [...sellingOrdersData, ...buyingOrdersData];
      
      // Sort by date (use createdAt or orderDate) and take the 5 most recent
      const recentOrdersData = [...allOrdersData]
        .sort((a, b) => {
          const aTimestamp = a.createdAt?.seconds || a.orderDate?.seconds || 0;
          const bTimestamp = b.createdAt?.seconds || b.orderDate?.seconds || 0;
          return bTimestamp - aTimestamp;
        })
        .slice(0, 5);
      
      setRecentOrders(recentOrdersData);
      setStats(prev => ({ ...prev, totalOrders: allOrdersData.length }));
      
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Only redirect if user is definitely not authenticated
    if (isAuthenticated === false) {
      router.push('/login');
      return;
    }
    
    // Wait for user data before fetching dashboard data
    if (!user) {
      return;
    }
    
    fetchUserData();
  }, [isAuthenticated, user, router, fetchUserData]);

  // Business Dashboard rendering
  const renderBusinessDashboard = () => {
    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Total Listings Card */}
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Products</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalListings}</h3>
              </div>
              <span className="bg-blue-100 p-3 rounded-lg">
                <FiPackage className="text-blue-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-500 flex items-center text-sm font-medium">
                <FiTrendingUp className="mr-1" /> 3.2%
              </span>
              <span className="text-gray-400 text-sm ml-2">vs last week</span>
            </div>
          </motion.div>
          
          {/* Active Listings Card */}
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Listings</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.activeListings || 0}</h3>
              </div>
              <span className="bg-green-100 p-3 rounded-lg">
                <FiShoppingBag className="text-green-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-500 flex items-center text-sm font-medium">
                <FiTrendingUp className="mr-1" /> 5.8%
              </span>
              <span className="text-gray-400 text-sm ml-2">vs last week</span>
            </div>
          </motion.div>
          
          {/* Orders Card */}
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</h3>
              </div>
              <span className="bg-purple-100 p-3 rounded-lg">
                <FiUsers className="text-purple-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-500 flex items-center text-sm font-medium">
                <FiTrendingUp className="mr-1" /> 12.2%
              </span>
              <span className="text-gray-400 text-sm ml-2">vs last week</span>
            </div>
          </motion.div>
          
          {/* Revenue Card */}
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats?.totalRevenue || 0)}</h3>
              </div>
              <span className="bg-amber-100 p-3 rounded-lg">
                <FiDollarSign className="text-amber-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-500 flex items-center text-sm font-medium">
                <FiTrendingUp className="mr-1" /> 8.7%
              </span>
              <span className="text-gray-400 text-sm ml-2">vs last week</span>
            </div>
          </motion.div>
        </div>
        
        {/* Product Views Analytics */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Product Views Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4">Daily Views (Last 7 Days)</h4>
              <div className="h-64 flex items-end justify-between space-x-2">
                {viewsData.daily.map((views, index) => {
                  const height = views > 0 ? (views / Math.max(...viewsData.daily)) * 100 : 10;
                  const day = new Date();
                  day.setDate(day.getDate() - (6 - index));
                  const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                  
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="w-full flex justify-center">
                        <div 
                          className="w-full max-w-[30px] bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-md" 
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 mt-2">{dayName}</span>
                      <span className="text-xs font-bold text-gray-700">{views}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4">Weekly Views (Last 4 Weeks)</h4>
              <div className="h-64 flex items-end justify-between space-x-2">
                {viewsData.weekly.map((views, index) => {
                  const height = views > 0 ? (views / Math.max(...viewsData.weekly)) * 100 : 10;
                  const week = index + 1;
                  
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="w-full flex justify-center">
                        <div 
                          className="w-full max-w-[40px] bg-gradient-to-t from-blue-500 to-sky-400 rounded-t-md" 
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 mt-2">Week {week}</span>
                      <span className="text-xs font-bold text-gray-700">{views}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Top Selling Products and Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Top Selling Products</h3>
            <div className="space-y-4">
              {topSellingProducts.length > 0 ? (
                topSellingProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden mr-4 flex-shrink-0">
                      {product.imageUrl ? (
                        <Image src={product.imageUrl} alt={product.title} className="object-cover" fill sizes="(max-width: 768px) 100vw, 300px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiPackage className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{product.title}</h4>
                      <p className="text-sm text-gray-500">{product.viewCount} views · {formatCurrency(product.price)}</p>
                    </div>
                    <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      #{index + 1}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FiPackage className="text-gray-300 text-4xl mx-auto mb-3" />
                  <p className="text-gray-500">No top selling products yet</p>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Recent Orders */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Orders</h3>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden mr-4 flex-shrink-0 flex items-center justify-center">
                      {order.productImage ? (
                        <ImageWrapper src={order.productImage} alt={order.productTitle} className="object-cover" />
                      ) : (
                        <FiPackage className="text-gray-400 text-xl" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{order.productTitle}</h4>
                      <p className="text-sm text-gray-500">Ordered by {order.buyerName} · {new Date((order.createdAt?.seconds || order.orderDate?.seconds || 0) * 1000).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.orderStatus)}`}>
                        {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FiClock className="text-gray-300 text-4xl mx-auto mb-3" />
                  <p className="text-gray-500">No orders yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  };
  // NGO Dashboard rendering
  const renderNGODashboard = () => {
    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Food Listings</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalListings}</h3>
              </div>
              <span className="bg-purple-100 p-3 rounded-lg">
                <FiPackage className="text-purple-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-500 flex items-center text-sm font-medium">
                <FiTrendingUp className="mr-1" /> 4.1%
              </span>
              <span className="text-gray-400 text-sm ml-2">vs last week</span>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">People Impacted</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{(stats?.peopleImpacted || 0).toLocaleString()}</h3>
              </div>
              <span className="bg-indigo-100 p-3 rounded-lg">
                <FiUsers className="text-indigo-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-500 flex items-center text-sm font-medium">
                <FiTrendingUp className="mr-1" /> 8.5%
              </span>
              <span className="text-gray-400 text-sm ml-2">vs last month</span>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Food Collected</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</h3>
              </div>
              <span className="bg-green-100 p-3 rounded-lg">
                <FiCheck className="text-green-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-500 flex items-center text-sm font-medium">
                <FiTrendingUp className="mr-1" /> 12.2%
              </span>
              <span className="text-gray-400 text-sm ml-2">vs last week</span>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Engagement</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalViews}</h3>
              </div>
              <span className="bg-amber-100 p-3 rounded-lg">
                <FiHeart className="text-amber-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-500 flex items-center text-sm font-medium">
                <FiTrendingUp className="mr-1" /> 7.3%
              </span>
              <span className="text-gray-400 text-sm ml-2">vs last week</span>
            </div>
          </motion.div>
        </div>
        
        {/* Include same Product Views Analytics section as in Business Dashboard */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Outreach Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4">Daily Impact (Last 7 Days)</h4>
              <div className="h-64 flex items-end justify-between space-x-2">
                {viewsData.daily.map((views, index) => {
                  const height = views > 0 ? (views / Math.max(...viewsData.daily)) * 100 : 10;
                  const day = new Date();
                  day.setDate(day.getDate() - (6 - index));
                  const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                  
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="w-full flex justify-center">
                        <div 
                          className="w-full max-w-[30px] bg-gradient-to-t from-purple-500 to-indigo-400 rounded-t-md" 
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 mt-2">{dayName}</span>
                      <span className="text-xs font-bold text-gray-700">{views}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4">People Reached (Last 4 Weeks)</h4>
              <div className="h-64 flex items-end justify-between space-x-2">
                {viewsData.weekly.map((views, index) => {
                  const height = views > 0 ? (views / Math.max(...viewsData.weekly)) * 100 : 10;
                  const week = index + 1;
                  
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="w-full flex justify-center">
                        <div 
                          className="w-full max-w-[40px] bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t-md" 
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 mt-2">Week {week}</span>
                      <span className="text-xs font-bold text-gray-700">{views}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Include top listings and recent orders sections from business dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Food Collections */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Top Food Collections</h3>
            <div className="space-y-4">
              {topSellingProducts.length > 0 ? (
                topSellingProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden mr-4 flex-shrink-0">
                      {product.imageUrl ? (
                        <Image src={product.imageUrl} alt={product.title} className="object-cover" fill sizes="(max-width: 768px) 100vw, 300px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiPackage className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{product.title}</h4>
                      <p className="text-sm text-gray-500">{product.soldCount || 0} collections · {product.viewCount} views</p>
                    </div>
                    <div className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                      #{index + 1}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FiPackage className="text-gray-300 text-4xl mx-auto mb-3" />
                  <p className="text-gray-500">No food collections yet</p>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Recent Pick-ups */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Pick-ups</h3>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden mr-4 flex-shrink-0 flex items-center justify-center">
                        {order.productImage ? (
                          <ImageWrapper src={order.productImage} alt={order.productTitle} className="object-cover" />
                        ) : (
                          <FiPackage className="text-gray-400 text-xl" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{order.productTitle}</h4>
                        <p className="text-sm text-gray-500">
                          {user?.uid === order.sellerId ? `From ${order.buyerName}` : `To ${order.sellerName}`} · 
                          {new Date((order.createdAt?.seconds || order.orderDate?.seconds || 0) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.orderStatus)}`}>
                          {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {order.isDonation ? 'Donation' : `${formatCurrency(order.totalAmount)}`}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <FiClock className="text-gray-300 text-4xl mx-auto mb-3" />
                  <p className="text-gray-500">No pick-ups yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  };

  // Individual Dashboard rendering
  const renderIndividualDashboard = () => {
    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">My Listings</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalListings}</h3>
              </div>
              <span className="bg-blue-100 p-3 rounded-lg">
                <FiPackage className="text-blue-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-gray-500 text-sm">
                {stats?.activeListings || 0} active now
              </span>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Views</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalViews}</h3>
              </div>
              <span className="bg-green-100 p-3 rounded-lg">
                <FiUsers className="text-green-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-500 flex items-center text-sm font-medium">
                <FiTrendingUp className="mr-1" /> 5.2%
              </span>
              <span className="text-gray-400 text-sm ml-2">vs last week</span>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Saved Food</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.recentSoldItems || 0}</h3>
              </div>
              <span className="bg-amber-100 p-3 rounded-lg">
                <FiHeart className="text-amber-600" />
              </span>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-gray-500 text-sm">
                In the last 30 days
              </span>
            </div>
          </motion.div>
        </div>
        
        {/* Recent Listings Section */}
        {listings && listings.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">My Food Listings</h3>
              <Link href="/listings/create" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                Add New <FiPackage className="ml-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.slice(0, 6).map((listing: Listing) => (
                <Link href={`/listings/${listing.id}`} key={listing.id}>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer"
                  >
                    <div className="h-40 overflow-hidden">
                      {listing.imageUrl ? (
                        <ImageWrapper src={listing.imageUrl} alt={listing.title} />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <FiPackage className="text-gray-400 text-2xl" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 truncate">{listing.title}</h4>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-900 font-bold">{formatCurrency(listing.price)}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          listing.isAvailable 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {listing.isAvailable ? 'Active' : 'Claimed'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-gray-600">
                {accountType === 'business' 
                  ? 'Track your products, orders, and business analytics'
                  : accountType === 'ngo'
                    ? 'Monitor your impact and food rescue operations'
                    : 'Manage your food sharing activities'}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link href="/profile">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                  <FiArrowLeft className="mr-2 -ml-1" /> Back to Profile
                </button>
              </Link>
            </div>
          </div>
          
          {/* Dashboard Content */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex flex-col items-center justify-center h-80">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                <p className="mt-4 text-gray-600">Loading dashboard...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <FiAlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              {accountType === 'business' && renderBusinessDashboard()}
              {accountType === 'ngo' && renderNGODashboard()}
              {(accountType === 'individual' || !accountType) && renderIndividualDashboard()}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
