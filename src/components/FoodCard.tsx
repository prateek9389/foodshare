import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiHeart, FiMap, FiClock, FiDollarSign, FiGift, FiArrowRight } from 'react-icons/fi';

interface FoodCardProps {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  location: string;
  price: number | null;
  isDonation: boolean;
  expiryDate: Date;
  distance?: string;
}

const FoodCard: React.FC<FoodCardProps> = ({
  id,
  title,
  imageUrl,
  description,
  location,
  price,
  isDonation,
  expiryDate,
  distance,
}) => {
  // Calculate days remaining until expiry
  const currentDate = new Date();
  const expiryTime = expiryDate.getTime();
  const currentTime = currentDate.getTime();
  const diffTime = expiryTime - currentTime;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Format expiry status
  const getExpiryStatus = () => {
    if (diffDays < 0) {
      return { text: 'Expired', color: 'text-red-500 bg-red-100' };
    } else if (diffDays === 0) {
      return { text: 'Expires Today', color: 'text-orange-500 bg-orange-100' };
    } else if (diffDays === 1) {
      return { text: '1 day left', color: 'text-orange-500 bg-orange-100' };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} days left`, color: 'text-yellow-500 bg-yellow-100' };
    } else {
      return { text: `${diffDays} days left`, color: 'text-green-500 bg-green-100' };
    }
  };

  const expiryStatus = getExpiryStatus();

  return (
    <motion.div
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
      className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
      style={{
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(246,249,252,1) 100%)',
      }}
    >
      <Link href={`/listings/${id}`}>
        <div className="relative h-48 sm:h-56 w-full overflow-hidden">
          <Image
            src={imageUrl || '/images/placeholder-food.jpg'}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
          {/* Image overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent"></div>
          
          {/* Badge for donation or sale */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`absolute top-4 left-4 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-lg ${
              isDonation 
                ? 'bg-gradient-to-r from-green-500/90 to-green-600/90 text-white' 
                : price === 0 || price === null 
                  ? 'bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white'
                  : 'bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-white'
            }`}
          >
            {isDonation ? (
              <span className="flex items-center">
                <FiGift className="mr-1.5" /> Donation
              </span>
            ) : price === 0 || price === null ? (
              <span className="flex items-center">
                <FiDollarSign className="mr-1.5" /> Free
              </span>
            ) : (
              <span className="flex items-center">
                <FiDollarSign className="mr-1.5" /> ₹{price}
              </span>
            )}
          </motion.div>
          
          {/* Wishlist button */}
          <motion.button 
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-4 right-4 p-2.5 bg-white/95 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all duration-200"
          >
            <FiHeart className="text-gray-400 hover:text-red-500 transition-colors duration-200" size={18} />
          </motion.button>
          
          {/* Expiry badge */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`absolute bottom-4 right-4 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-lg ${
              diffDays < 0 ? 'bg-gradient-to-r from-red-500/90 to-red-600/90 text-white' :
              diffDays <= 1 ? 'bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white' :
              diffDays <= 3 ? 'bg-gradient-to-r from-yellow-500/90 to-yellow-600/90 text-white' :
              'bg-gradient-to-r from-green-500/90 to-green-600/90 text-white'
            }`}
          >
            <span className="flex items-center">
              <FiClock className="mr-1.5" /> {expiryStatus.text}
            </span>
          </motion.div>
        </div>
        
        <div className="p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 line-clamp-1 tracking-tight">{title}</h3>
          
          <div className="mt-3 flex items-center text-xs sm:text-sm text-gray-600">
            <div className="bg-green-50 p-1.5 rounded-full mr-2.5 border border-green-100">
              <FiMap className="text-green-500" size={14} />
            </div>
            <span className="line-clamp-1 text-gray-700">{location}</span>
            {distance && (
              <span className="ml-1.5 text-xs text-gray-500 font-medium bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">({distance})</span>
            )}
          </div>
          
          <p className="mt-3.5 text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">{description}</p>
          
          <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent my-5 opacity-60"></div>
          
          <div className="flex justify-between items-center">
            {isDonation ? (
              <div className="py-1.5 px-3 bg-green-50 rounded-full border border-green-100 shadow-sm">
                <span className="text-xs sm:text-sm text-green-600 font-semibold flex items-center">
                  <FiGift className="mr-1.5" size={14} /> Donation
                </span>
              </div>
            ) : (
              <div className={`py-1.5 px-3 rounded-full border shadow-sm ${price === 0 || price === null ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
                <span className={`text-xs sm:text-sm font-semibold flex items-center ${price === 0 || price === null ? 'text-blue-600' : 'text-amber-600'}`}>
                  <FiDollarSign className="mr-1.5" size={14} /> {price === 0 || price === null ? 'Free' : `₹${price}`}
                </span>
              </div>
            )}
            
            <motion.div
              whileHover={{ scale: 1.05, x: 3 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 py-1.5 px-4 rounded-full shadow-sm hover:shadow transition-all duration-200"
            >
              View <FiArrowRight className="ml-1.5" size={14} />
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default FoodCard;
