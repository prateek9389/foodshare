'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import Navbar from '../../../components/Navbar';

// Feature data from page.tsx (should be moved to a separate data file in a real app)
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

export default function FeatureDetailPage() {
  const { id } = useParams();
  const featureId = Array.isArray(id) ? id[0] : id;
  
  const feature = features.find(f => f.id === featureId);
  
  if (!feature) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Feature not found</h1>
          <p className="text-gray-600 mb-6">The feature you&apos;re looking for doesn&apos;t exist or has been moved.</p>
          <Link 
            href="/" 
            className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-medium"
          >
            Go back home
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className={`bg-gradient-to-r ${feature.gradient} py-12 md:py-24`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-start mb-8">
            <Link 
              href="/" 
              className="flex items-center text-gray-700 hover:text-gray-900 font-medium"
            >
              <FiArrowLeft className="mr-2" /> Back to Home
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="md:w-1/2">
              <motion.h1 
                className={`text-3xl md:text-4xl font-bold ${feature.textColor} mb-4`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {feature.title}
              </motion.h1>
              <motion.p 
                className="text-lg text-gray-700 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {feature.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Link
                  href="/listings"
                  className={`bg-gradient-to-r ${feature.buttonColor} text-white py-3 px-6 rounded-lg font-medium inline-flex items-center hover:shadow-lg transition-all`}
                >
                  Browse Food Listings
                </Link>
              </motion.div>
            </div>
            <div className="md:w-1/2">
              <motion.div 
                className="rounded-xl overflow-hidden shadow-xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image 
                    src={feature.image} 
                    alt={feature.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="bg-white rounded-xl shadow-md p-8 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className={`text-2xl font-bold ${feature.textColor} mb-6`}>Why This Matters</h2>
            <div className="space-y-4">
              {feature.fullDescription.map((paragraph, index) => (
                <p key={index} className="text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-xl shadow-md p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className={`text-2xl font-bold ${feature.textColor} mb-6`}>Key Benefits</h2>
            <ul className="space-y-4">
              {feature.benefits.map((benefit, index) => (
                <motion.li 
                  key={index} 
                  className="flex items-start"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
                >
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${feature.buttonColor} flex items-center justify-center mt-0.5 mr-3 flex-shrink-0`}>
                    <FiCheck className="text-white" />
                  </div>
                  <p className="text-gray-700">{benefit}</p>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
      
      {/* Call to Action */}
      <div className={`bg-gradient-to-r ${feature.gradient} py-16`}>
        <div className="container mx-auto px-4 text-center">
          <h2 className={`text-2xl md:text-3xl font-bold ${feature.textColor} mb-6`}>Ready to Get Started?</h2>
          <p className="text-gray-700 max-w-2xl mx-auto mb-8">
            Join our community today and start enjoying all the benefits of local food sharing. 
            It&apos;s easy to sign up and start browsing listings in your area.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className={`bg-gradient-to-r ${feature.buttonColor} text-white py-3 px-6 rounded-lg font-medium inline-flex items-center justify-center hover:shadow-lg transition-all`}
            >
              Sign Up Now
            </Link>
            <Link
              href="/listings"
              className="bg-white text-gray-700 py-3 px-6 rounded-lg font-medium inline-flex items-center justify-center hover:bg-gray-50 border border-gray-200 transition-all"
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
