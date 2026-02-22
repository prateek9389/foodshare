'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiArrowRight, FiMapPin, FiClock, FiArrowLeft, FiGift, FiDollarSign } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { MdFoodBank, MdBreakfastDining, MdKitchen, MdDinnerDining } from 'react-icons/md';
import { GiMilkCarton, GiFruitBowl, GiBread, GiCannedFish, GiCupcake, GiCookie } from 'react-icons/gi';
import Navbar from '../components/Navbar';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { FoodListing } from '../models/FoodListing';

// Type definitions

// Banner data
const banners = [
  {
    id: 1,
    title: "Fresh Vegetables",
    subtitle: "Big discount",
    description: "Save up to 50% off on your first order",
    image: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?q=80&w=1000",
    color: "from-green-500 to-green-600"
  },
  {
    id: 2,
    title: "Organic Fruits",
    subtitle: "Healthy choices",
    description: "Support local farmers and eat healthy",
    image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=1000",
    color: "from-orange-500 to-orange-600"
  },
  {
    id: 3,
    title: "Stop Food Waste",
    subtitle: "Join the movement",
    description: "Share and reduce food waste in your community",
    image: "https://images.unsplash.com/photo-1506484381205-f7945653044d?q=80&w=1000",
    color: "from-blue-500 to-blue-600"
  }
];

// Updated Category interface to include icon component
interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  count: number;
}

// Food categories from add-listing page
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

// Map category names to icon components and colors
const getCategoryIcon = (category: string) => {
  switch(category) {
    case 'Fruits & Vegetables': return { icon: GiFruitBowl, color: "from-green-400 to-green-600" };
    case 'Dairy & Eggs': return { icon: GiMilkCarton, color: "from-blue-400 to-blue-600" };
    case 'Bread & Bakery': return { icon: GiBread, color: "from-yellow-400 to-yellow-600" };
    case 'Pantry Items': return { icon: GiCannedFish, color: "from-purple-400 to-purple-600" };
    case 'Ready-to-Eat': return { icon: MdDinnerDining, color: "from-red-400 to-red-600" };
    case 'Snacks': return { icon: GiCookie, color: "from-orange-400 to-orange-600" };
    case 'Meat & Seafood': return { icon: MdKitchen, color: "from-red-500 to-pink-600" };
    case 'Beverages': return { icon: MdFoodBank, color: "from-blue-500 to-indigo-600" };
    case 'Homemade': return { icon: MdBreakfastDining, color: "from-amber-400 to-amber-600" };
    case 'Other': return { icon: GiCupcake, color: "from-gray-400 to-gray-600" };
    default: return { icon: MdFoodBank, color: "from-green-400 to-green-600" };
  }
};

// Initial categories data
const initialCategories: Category[] = FOOD_CATEGORIES.map(name => {
  const { icon, color } = getCategoryIcon(name);
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return {
    id,
    name,
    icon,
    color,
    count: 0 // Will be updated from Firebase
  };
});

// Features data with detailed content for individual pages
const features = [
  {
    id: "fresh-healthy",
    title: "Fresh & Healthy Food",
    description: "Find fresh food options from your community",
    image: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=800",
    gradient: "from-green-100 to-green-200",
    textColor: "text-green-600",
    buttonColor: "from-green-500 to-green-600",
    fullDescription: [
      "Access to fresh, healthy food is a fundamental right that everyone deserves. Our platform connects you with local sources of fresh produce, homemade meals, and organic options that are often unavailable in conventional stores.",
      "By choosing local and fresh food options, you're not only improving your health but also supporting local farmers and food producers who prioritize quality over mass production.",
    ],
    benefits: [
      "Greater nutritional value from freshly harvested produce",
      "Support local farmers and food artisans in your community",
      "Reduce carbon footprint by choosing locally sourced foods",
      "Discover unique and seasonal varieties not found in supermarkets",
      "Connect with health-conscious neighbors who share your values"
    ]
  },
  {
    id: "reduce-waste",
    title: "Reduce Food Waste",
    description: "Help save the environment by sharing excess food",
    image: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?q=80&w=800",
    gradient: "from-orange-100 to-orange-200",
    textColor: "text-orange-600",
    buttonColor: "from-orange-500 to-orange-600",
    fullDescription: [
      "One-third of all food produced globally is wasted, contributing to greenhouse gas emissions and climate change. Our platform provides a simple way to share food that would otherwise go to waste.",
      "Whether you're a restaurant with extra prepared meals at the end of the day, a gardener with an abundant harvest, or a family who cooked too much, our community helps ensure that good food finds its way to people who can enjoy it."
    ],
    benefits: [
      "Reduce your personal carbon footprint and environmental impact",
      "Save money by sharing costs or receiving food that would be wasted",
      "Decrease methane emissions from food decomposing in landfills",
      "Conserve resources used in food production, packaging, and transportation",
      "Contribute to a circular economy where resources are shared efficiently"
    ]
  },
  {
    id: "connect-locally",
    title: "Connect Locally",
    description: "Build community connections through food sharing",
    image: "https://images.unsplash.com/photo-1593113630400-ea4288922497?q=80&w=800",
    gradient: "from-blue-100 to-blue-200",
    textColor: "text-blue-600",
    buttonColor: "from-blue-500 to-blue-600",
    fullDescription: [
      "In today's digital world, meaningful local connections are increasingly rare. Food has always been a powerful way to bring people together, transcending cultural and social boundaries.",
      "Our platform helps you discover neighbors who share your passion for food, sustainability, and community building. Whether you're new to an area or looking to strengthen local ties, food sharing creates authentic connections."
    ],
    benefits: [
      "Meet neighbors and build meaningful relationships in your community",
      "Share cultural traditions and recipes with diverse community members",
      "Create resilient local networks that can support each other",
      "Learn new skills through food exchanges and potential workshops",
      "Participate in a sharing economy that values generosity and connection"
    ]
  },
  {
    id: "save-money",
    title: "Save Money",
    description: "Affordable alternatives to expensive grocery shopping",
    image: "https://images.unsplash.com/photo-1607863680198-23d4b2565df0?q=80&w=800",
    gradient: "from-purple-100 to-purple-200",
    textColor: "text-purple-600",
    buttonColor: "from-purple-500 to-purple-600",
    fullDescription: [
      "With rising food costs, finding affordable options is more important than ever. Our platform offers ways to access quality food at reduced prices or through sharing arrangements that benefit everyone involved.",
      "From community-supported agriculture to bulk buying groups and food swaps, there are many creative ways to eat well without breaking the bank."
    ],
    benefits: [
      "Access quality food at lower costs through sharing and group purchases",
      "Reduce grocery bills by trading excess food you can't use",
      "Find deals on surplus food from local businesses and farms",
      "Minimize food waste in your household by getting only what you need",
      "Learn budget-friendly cooking tips from community members"
    ]
  }
];

export default function Home() {
  // States for fetching data
  const [latestListings, setLatestListings] = useState<FoodListing[]>([]);
  const [, setFruitVeggieListings] = useState<FoodListing[]>([]);
  const [, setBakeryListings] = useState<FoodListing[]>([]);
  const [, setDairyListings] = useState<FoodListing[]>([]);
  const [, setPantryListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  // Fetch latest listings and category counts
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        
        // Latest listings
        const latestQuery = query(
          collection(db, 'foodListings'),
          where('isAvailable', '==', true),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const latestSnap = await getDocs(latestQuery);
        const latestData = latestSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FoodListing[];

        setLatestListings(latestData);

        // Fetch all listings to count categories
        const allListingsQuery = query(
          collection(db, 'foodListings'),
          where('isAvailable', '==', true)
        );

        const allListingsSnap = await getDocs(allListingsQuery);
        const categoryCounts: Record<string, number> = {};

        // Initialize counts for all categories
        FOOD_CATEGORIES.forEach(cat => {
          categoryCounts[cat] = 0;
        });

        // Count items in each category
        allListingsSnap.docs.forEach(doc => {
          const listing = doc.data();
          const category = listing.category as string;
          
          if (category && categoryCounts[category] !== undefined) {
            categoryCounts[category]++;
          }
        });

        // Update categories with real counts
        setCategories(prevCategories => {
          return prevCategories.map(cat => ({
            ...cat,
            count: categoryCounts[cat.name] || 0
          }));
        });

        // Fetch category-specific listings
        const fetchCategoryListings = async (category: string, setter: React.Dispatch<React.SetStateAction<FoodListing[]>>) => {
          const categoryQuery = query(
            collection(db, 'foodListings'),
            where('isAvailable', '==', true),
            where('category', '==', category),
            orderBy('createdAt', 'desc'),
            limit(6)
          );

          const categorySnap = await getDocs(categoryQuery);
          const categoryData = categorySnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as FoodListing[];

          setter(categoryData);
        };

        // Fetch for specific categories for section displays
        await Promise.all([
          fetchCategoryListings('Fruits & Vegetables', setFruitVeggieListings),
          fetchCategoryListings('Bread & Bakery', setBakeryListings),
          fetchCategoryListings('Dairy & Eggs', setDairyListings),
          fetchCategoryListings('Pantry Items', setPantryListings),
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching listings:', error);
        setLoading(false);
      }
    };

    fetchListings();
  }, []); 

  // Banner auto-rotation
  useEffect(() => {
    const bannerInterval = setInterval(() => {
      setActiveBanner(prev => (prev + 1) % banners.length);
    }, 5000);
    
    return () => clearInterval(bannerInterval);
  }, []);
  
  // Default placeholder image for listings with no image
  const defaultFoodImage = '/images/default-food-image.jpg';

  // Helper function to format time in a relative format (e.g., "2 hours ago")
  const timeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      return 'Recently';
    }
  };

  return (
    <div className="bg-gray-50">
      <Navbar />
      
      {/* Hero Banner Slider - Horizontally Scrollable */}
      <section className="relative overflow-hidden py-4 md:py-6">
        <div className="flex items-center absolute top-1/2 -translate-y-1/2 w-full justify-between px-4 z-10">
          <button 
            onClick={() => setActiveBanner(prev => (prev - 1 + banners.length) % banners.length)}
            className="bg-white/80 backdrop-blur-sm text-gray-800 p-2 rounded-full shadow-lg hover:bg-white transition-all"
            aria-label="Previous banner"
          >
            <FiArrowLeft size={20} />
          </button>
          <button 
            onClick={() => setActiveBanner(prev => (prev + 1) % banners.length)}
            className="bg-white/80 backdrop-blur-sm text-gray-800 p-2 rounded-full shadow-lg hover:bg-white transition-all"
            aria-label="Next banner"
          >
            <FiArrowRight size={20} />
          </button>
        </div>
        
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex transition-all duration-700 ease-in-out" style={{ transform: `translateX(-${activeBanner * 100}%)` }}>
            {banners.map((banner, index) => (
              <div key={banner.id} className="min-w-full flex-shrink-0">
                <div className={`bg-gradient-to-r ${banner.color} text-white py-10 md:py-16 px-5 md:px-8 rounded-xl mx-2 md:mx-4 relative overflow-hidden shadow-lg`}>
                  {/* Background image with overlay for mobile and desktop */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center" 
                    style={{ backgroundImage: `url('${banner.image}')` }}
                  ></div>
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${banner.color} opacity-80`}></div>
                  {/* Pattern overlay */}
                  <div className="absolute inset-0 bg-cover bg-center opacity-10" 
                      style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cubes.png')` }}></div>
                  
                  {/* Content container */}
                  <div className="container mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: activeBanner === index ? 1 : 0, y: activeBanner === index ? 0 : 20 }}
                      transition={{ duration: 0.6 }}
                      className="md:w-1/2 z-10 text-center md:text-left relative pb-6 md:pb-0"
                    >
                      <div className="inline-block text-sm font-semibold text-white/90 uppercase tracking-wider mb-3 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">{banner.subtitle}</div>
                      <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                        {banner.title}
                      </h1>
                      <p className="text-base md:text-xl mb-8 text-white/90 max-w-md mx-auto md:mx-0">
                        {banner.description}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <Link href="/listings" className="bg-white text-gray-800 hover:bg-gray-100 py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center">
                          <span>Browse Listings</span>
                          <svg className="w-5 h-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </Link>
                        <Link href="/about" className="border border-white hover:bg-white/10 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center backdrop-blur-sm">
                          <span>Learn More</span>
                        </Link>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="md:w-1/2 relative mt-8 md:mt-0 hidden md:block"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: activeBanner === index ? 1 : 0, scale: activeBanner === index ? 1 : 0.9 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    >
                      <div className="relative w-full max-w-md aspect-[4/3] rounded-lg overflow-hidden shadow-2xl mx-auto">
                        <Image 
                          src={banner.image} 
                          alt={banner.title} 
                          fill
                          priority
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Banner Pagination Indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {banners.map((_, index) => (
            <button 
              key={index}
              onClick={() => setActiveBanner(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${activeBanner === index ? 'bg-green-600 w-6' : 'bg-gray-300 dark:bg-gray-600'}`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      </section>
      
     
      
      {/* Categories - Horizontally Scrollable */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-2">
            <div className="mb-3 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1.5">Browse Categories</h2>
              <p className="text-gray-600 text-sm md:text-base">Find exactly what you&apos;re looking for with our food categories</p>
            </div>
            <Link 
              href="/categories" 
              className="text-green-600 hover:text-green-700 font-medium flex items-center self-start md:self-center bg-white hover:bg-green-50 px-4 py-2.5 rounded-full border border-green-100 shadow-sm transition-all duration-300 hover:shadow group"
            >
              <span>All Categories</span>
              <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
          
          <div className="relative">
            {/* Left shadow for scroll indication */}
            
            
            <div className="overflow-x-auto scrollbar-hide pb-6">
              <div className="flex gap-4 md:gap-6 min-w-max pl-1 pr-6">
                {categories.map((category, index) => (
                  <Link href={`/listings?category=${category.name}`} key={category.id}>
                    <motion.div 
                      className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center justify-between w-32 h-44 md:w-40 md:h-52 cursor-pointer border border-green-100 hover:border-transparent transition-all overflow-hidden"
                      whileHover={{ y: -8, boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.1), 0 10px 15px -5px rgba(0, 0, 0, 0.05)' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1, type: 'spring', stiffness: 300 }}
                      style={{
                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(240,253,244,1) 100%)',
                      }}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 rounded-full bg-gradient-to-br opacity-5 from-gray-300 to-gray-500" />
                      
                      <div className={`w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br ${category.color} p-4 mb-4 shadow-md transform transition-all duration-300 hover:scale-105 hover:rotate-3`}>
                        <motion.div
                          animate={{ rotate: [0, 10, 0, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="text-white w-full h-full"
                        >
                          {React.createElement(category.icon, { size: 32 })}
                        </motion.div>
                      </div>
                      <div className="flex flex-col items-center text-center mt-auto">
                        <span className="text-sm md:text-base font-bold text-gray-800 mb-2 line-clamp-1 tracking-tight">{category.name}</span>
                        <span className="text-xs font-semibold bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100/50">{category.count} items</span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
                
                {/* Right shadow for scroll indication */}
                
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Cards - Horizontally Scrollable */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-2">
            <div className="mb-3 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1.5">Why Choose FoodShare?</h2>
              <p className="text-gray-600 text-sm md:text-base">Discover the benefits of using our platform to share and reduce food waste</p>
            </div>
            <Link 
              href="/features" 
              className="text-green-600 hover:text-green-700 font-medium flex items-center self-start md:self-center bg-white hover:bg-green-50 px-4 py-2.5 rounded-full border border-green-100 shadow-sm transition-all duration-300 hover:shadow group"
            >
              <span>All Features</span>
              <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
          
          <div className="relative">
            {/* Left shadow for scroll indication */}
            
            {/* Right shadow for scroll indication */}
            
            
            <div className="overflow-x-auto scrollbar-hide pb-6 -mx-4 px-4">
              <div className="flex gap-6 min-w-max">
                {features.map((feature, index) => (
                  <motion.div 
                    key={feature.id}
                    className={`bg-white rounded-2xl p-7 shadow-md border border-green-100 flex flex-col w-80 md:w-96 h-[480px] relative overflow-hidden`}
                    whileHover={{ y: -8, boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.1), 0 10px 15px -5px rgba(0, 0, 0, 0.05)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1, type: 'spring', stiffness: 300 }}
                    style={{
                      backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(250,251,251,1) 100%)',
                    }}
                  >
                    {/* Background decoration */}
                    <div className={`absolute top-0 right-0 w-64 h-64 -mt-12 -mr-12 rounded-full ${feature.gradient} opacity-10`} />
                    
                    <div className="aspect-video relative mb-6 overflow-hidden rounded-xl shadow-md group">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        className="object-cover transition-transform duration-700 scale-100 group-hover:scale-110"
                      />
                      <div className={`absolute inset-0 ${feature.gradient} opacity-30 group-hover:opacity-0 transition-opacity duration-700`}></div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                    
                    <div className="mt-auto space-y-4">
                      <motion.div 
                        className="flex items-center" 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        <div className={`w-9 h-9 rounded-full ${feature.gradient} flex items-center justify-center mr-3 shadow-sm`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 font-medium">{feature.benefits[0]}</span>
                      </motion.div>
                      <motion.div 
                        className="flex items-center"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                      >
                        <div className={`w-9 h-9 rounded-full ${feature.gradient} flex items-center justify-center mr-3 shadow-sm`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 font-medium">{feature.benefits[1]}</span>
                      </motion.div>
                    </div>
                    
                    <motion.div
                      className="mt-6"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Link 
                        href={`/features/${feature.id}`} 
                        className={`bg-gradient-to-r ${feature.buttonColor} text-white py-3 px-5 rounded-xl font-medium text-center hover:shadow-lg transition-all mt-auto flex items-center justify-center group overflow-hidden relative`}
                      >
                        <span className="relative z-10">Learn More</span>
                        <FiArrowRight className="ml-2 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                      </Link>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Latest Listings - Horizontally Scrollable */}
      <section className="py-12 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-2">
            <div className="mb-3 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1.5">Latest Food Listings</h2>
              <p className="text-gray-600 text-sm md:text-base">Explore recently shared food items in your community</p>
            </div>
            <Link 
              href="/listings" 
              className="text-green-600 hover:text-green-700 font-medium flex items-center self-start md:self-center bg-white hover:bg-green-50 px-4 py-2.5 rounded-full border border-green-100 shadow-sm transition-all duration-300 hover:shadow group"
            >
              <span>View All</span>
              <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="relative w-20 h-20">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-l-green-500 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : latestListings.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No listings found</h3>
              <p className="text-gray-600 mb-6">Be the first to share food in your community!</p>
              <Link href="/add-listing" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium inline-flex items-center justify-center transition-all">
                <span>Add Listing</span>
                <FiArrowRight className="ml-2" />
              </Link>
            </div>
          ) : (
            <div className="relative">
              {/* Left shadow for scroll indication */}
             
              {/* Right shadow for scroll indication */}
              
              
              <div className="overflow-x-auto scrollbar-hide pb-6 -mx-4 px-4">
                <div className="flex gap-6 min-w-max">
                  {latestListings.map((listing, index) => (
                    <Link href={`/listings/${listing.id}`} key={listing.id}>
                      <motion.div 
                        className="bg-white rounded-xl overflow-hidden w-[280px] hover:shadow-xl transition-all border border-green-100 flex flex-col h-full"
                        whileHover={{ y: -8, transition: { duration: 0.2 } }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05, type: 'spring', stiffness: 300 }}
                        style={{
                          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(240,253,244,1) 100%)',
                        }}
                      >
                        <div className="relative w-full h-48">
                          <Image 
                            src={listing.imageUrl || '/images/placeholder-food.jpg'} 
                            alt={listing.title}
                            fill
                            className="object-cover"
                          />
                          {/* Image overlay gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-50"></div>
                          
                          {/* Badge for donation or sale */}
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                              listing.isDonation 
                                ? 'bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white' 
                                : listing.price === 0 
                                  ? 'bg-gradient-to-r from-blue-500/90 to-cyan-500/90 text-white'
                                  : 'bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white'
                            }`}
                          >
                            {listing.isDonation ? (
                              <span className="flex items-center">
                                <FiGift className="mr-1.5" /> Donation
                              </span>
                            ) : listing.price === 0 ? (
                              <span className="flex items-center">
                                <FiDollarSign className="mr-1.5" /> Free
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <FiDollarSign className="mr-1.5" /> ₹{listing.price}
                              </span>
                            )}
                          </motion.div>
                          
                          {/* Location badge */}
                          <div className="absolute bottom-3 left-3 bg-black/30 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm flex items-center">
                            <FiMapPin size={10} className="mr-1" />
                            <span className="truncate max-w-[120px]">
                              {typeof listing.location === 'string' ? listing.location : 
                              typeof listing.location === 'object' && listing.location ? 
                              (listing.location.city || listing.location.address || 'Local Pickup') : 
                              'Local Pickup'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-5 flex flex-col flex-grow">
                          <h3 className="text-base sm:text-lg font-bold text-gray-800 line-clamp-1 tracking-tight">{listing.title}</h3>
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{listing.description}</p>
                          
                          <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4 opacity-70"></div>
                          
                          <div className="mt-auto flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="bg-gray-100 p-1 rounded-full mr-2">
                                <FiClock className="text-gray-500" size={12} />
                              </div>
                              <span className="text-xs text-gray-600">
                                {new Date(listing.expiryDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                              </span>
                            </div>
                            
                            <motion.div
                              whileHover={{ scale: 1.05, x: 3 }}
                              whileTap={{ scale: 0.95 }}
                              className="flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 py-1 px-3 rounded-full border border-indigo-100"
                            >
                              View <FiArrowRight className="ml-1" size={14} />
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      
      
      
      {/* Call to Action Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative z-10">
                {/* Pattern overlay */}
                <div className="absolute inset-0 bg-cover bg-center opacity-10 z-0" 
                  style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/food.png')` }}></div>
                
                <div className="relative z-10">  
                  <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{duration: 0.5}}>
                    <span className="inline-block bg-white/20 text-white text-sm font-semibold py-1 px-3 rounded-full mb-4">
                      Join Our Community
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">Ready to share food and reduce waste?</h2>
                    <p className="text-green-50 mb-8 text-lg max-w-md">Join our community today and start sharing your excess food or find affordable options near you.</p>
                  </motion.div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/add-listing" className="bg-white text-green-700 hover:bg-green-50 py-3 px-6 rounded-lg font-medium text-center transition-all shadow-md hover:shadow-lg flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Share Food
                    </Link>
                    <Link href="/listings" className="bg-transparent hover:bg-white/10 border-2 border-white text-white py-3 px-6 rounded-lg font-medium text-center transition-colors flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      Browse Listings
                    </Link>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2 relative min-h-[300px] md:min-h-0">
                <Image 
                  src="https://images.unsplash.com/photo-1506484381205-f7945653044d?q=80&w=2000"
                  alt="Fresh vegetables and fruits for sharing"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-green-700/80 via-transparent to-transparent md:bg-gradient-to-l md:from-transparent md:to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Listings Grid Section */}
      <section className="pt-16 pb-8 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Explore All Available Listings</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Browse through our complete collection of available food items from our community members.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-l-green-500 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : latestListings.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-md">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No listings found</h3>
              <p className="text-gray-600 mb-6">Be the first to share food in your community!</p>
              <Link href="/add-listing" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium inline-block shadow-md hover:shadow-lg transition-all">
                Add Listing
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {latestListings.map((listing) => (
                <Link href={`/listings/${listing.id}`} key={listing.id}>
                  <motion.div 
                    className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all border border-green-100 flex flex-col h-full"
                    whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="relative w-full h-48">
                      <Image 
                        src={listing.imageUrl || defaultFoodImage} 
                        alt={listing.title}
                        fill
                        className="object-cover"
                      />
                      {listing.isDonation && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Donation
                        </div>
                      )}
                      {listing.price === 0 && !listing.isDonation && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Free
                        </div>
                      )}
                      {/* Location badge */}
                      <div className="absolute bottom-2 left-2 bg-black/30 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm flex items-center">
                        <FiMapPin size={10} className="mr-1" />
                        <span className="truncate max-w-[120px]">
                          {typeof listing.location === 'string' ? listing.location : 
                           typeof listing.location === 'object' && listing.location ? 
                           (listing.location.city || listing.location.address || 'Local Pickup') : 
                           'Local Pickup'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">{listing.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.description}</p>
                      <div className="mt-auto flex justify-between items-center">
                        <div className="font-medium">
                          {listing.isDonation ? (
                            <span className="text-green-600">Donation</span>
                          ) : listing.price === 0 ? (
                            <span className="text-blue-600">Free</span>
                          ) : (
                            <span className="text-gray-800">₹{listing.price}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {timeAgo(
                            listing.createdAt instanceof Timestamp ? 
                              listing.createdAt.toDate() : 
                              listing.createdAt instanceof Date ? 
                                listing.createdAt : 
                                new Date()
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/listings" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium inline-flex items-center shadow-md hover:shadow-lg transition-all">
              View All Listings
              <FiArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
