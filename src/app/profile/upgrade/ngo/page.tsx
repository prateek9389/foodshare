'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiCheck, FiAlertTriangle, FiImage } from 'react-icons/fi';
import Image from 'next/image';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Navbar from '../../../../components/Navbar';
import MultiImageUploader from '../../../../components/MultiImageUploader';
import PaymentProcessor from '../../../../components/payments/PaymentProcessor';
import { uploadToCloudinary, uploadMultipleToCloudinary } from '../../../../utils/cloudinary';

// NGO Cause Areas
const NGO_CAUSES = [
  'Food Security',
  'Food Rescue',
  'Food Redistribution',
  'Community Welfare',
  'Hunger Relief',
  'Poverty Alleviation',
  'Environmental Sustainability',
  'Waste Reduction',
  'Children & Youth',
  'Healthcare',
  'Other'
];

const NGOUpgradePage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // State to track saving operations
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    ngoName: '',
    registrationNumber: '',
    cause: '',
    website: '',
    established: '',
    reachCount: '',
    description: ''
  });
  
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Images, 3: Payment, 4: Success
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [paymentQRImage, setPaymentQRImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [profileImageURL, setProfileImageURL] = useState<string | null>(null);
  const [galleryImageURLs, setGalleryImageURLs] = useState<string[]>([]);
  const [paymentQRImageURL, setPaymentQRImageURL] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    const fetchExistingData = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // If user is already an NGO, load the data
          if (userData.accountType === 'ngo' && userData.ngoInfo) {
            const ngoInfo = userData.ngoInfo;
            setFormData({
              ngoName: ngoInfo.ngoName || '',
              registrationNumber: ngoInfo.registrationNumber || '',
              cause: ngoInfo.cause || '',
              website: ngoInfo.website || '',
              established: ngoInfo.established ? 
                new Date(ngoInfo.established.seconds * 1000).toISOString().split('T')[0] : '',
              reachCount: ngoInfo.reachCount?.toString() || '',
              description: ngoInfo.description || ''
            });
            
            if (ngoInfo.profileImage) {
              setProfileImageURL(ngoInfo.profileImage);
            }
            
            if (ngoInfo.galleryImages && ngoInfo.galleryImages.length > 0) {
              setGalleryImageURLs(ngoInfo.galleryImages);
            }
            
            if (ngoInfo.paymentQR) {
              setPaymentQRImageURL(ngoInfo.paymentQR);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExistingData();
  }, [isAuthenticated, user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelect = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleGalleryImagesChange = (files: File[]) => {
    setGalleryImages(files);
  };

  const handleNextStep = async () => {
    setSaving(true); // Start saving process
    if (step === 1) {
      // Validate basic info
      if (!formData.ngoName || !formData.registrationNumber || !formData.cause) {
        setError('Please fill all required fields');
        setSaving(false); // Stop saving on validation error
        return;
      }
      
      setStep(2);
      setError('');
    } else if (step === 2) {
      // Validate images
      if (!profileImage && !profileImageURL) {
        setError('Please upload a profile image.');
        return;
      }
      
      setUploading(true);
      setSaving(true); // Start saving for image upload
      
      try {
        // Upload images to Cloudinary
        let profileImageUrl = profileImageURL;
        let galleryImagesUrls = galleryImageURLs;
        let paymentQRUrl = paymentQRImageURL;
        
        if (profileImage) {
          profileImageUrl = await uploadToCloudinary(profileImage);
        }
        
        if (galleryImages.length > 0) {
          galleryImagesUrls = await uploadMultipleToCloudinary(galleryImages);
        }
        
        if (paymentQRImage) {
          paymentQRUrl = await uploadToCloudinary(paymentQRImage);
        }
        
        // Save the URLs
        setProfileImageURL(profileImageUrl);
        setGalleryImageURLs(galleryImagesUrls);
        setPaymentQRImageURL(paymentQRUrl);
        
        setStep(3);
        setShowPayment(true);
      } catch (error) {
        console.error('Error uploading images:', error);
        setError('Failed to upload images. Please try again.');
      } finally {
        setUploading(false);
        setSaving(false); // Stop saving after image upload completes or fails
      }
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setSaving(true);
    
    try {
      if (!user?.uid) {
        throw new Error('User ID not found');
      }
      
      const userDocRef = doc(db, 'users', user.uid);
      const establishedDate = formData.established 
        ? new Date(formData.established) 
        : null;
      
      await updateDoc(userDocRef, {
        accountType: 'ngo',
        ngoInfo: {
          ngoName: formData.ngoName,
          registrationNumber: formData.registrationNumber,
          cause: formData.cause,
          website: formData.website || null,
          established: establishedDate,
          reachCount: formData.reachCount ? parseInt(formData.reachCount) : null,
          description: formData.description || null,
          profileImage: profileImageURL,
          galleryImages: galleryImageURLs,
          paymentQR: paymentQRImageURL
        }
      });
      
      setSuccess(true);
      
      // Redirect to profile after 3 seconds
      setTimeout(() => {
        router.push('/profile');
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    handleNextStep();
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/profile" className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <FiArrowLeft className="mr-2" /> Back to Profile
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 sm:p-10">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Upgrade to NGO Account
              </h1>
              <p className="text-purple-100">
                Join our network of NGOs working to tackle food waste and hunger
              </p>
            </div>
            
            {/* Main Content */}
            {loading ? (
              <div className="p-10 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            ) : error && !step ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiAlertTriangle className="text-red-600 text-2xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="p-6 sm:p-10">
                  {/* Step Progress */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          <span>1</span>
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-700">Basic Info</span>
                      </div>
                      <div className={`flex-1 mx-4 h-1 ${step > 1 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                      <div className="flex items-center">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          <span>2</span>
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-700">Images</span>
                      </div>
                      <div className={`flex-1 mx-4 h-1 ${step > 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                      <div className="flex items-center">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          <span>3</span>
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-700">Payment</span>
                      </div>
                    </div>
                  </div>
                  
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 rounded-md border border-red-200">
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}
                  
                  {/* Step 1: Basic Info */}
                  {step === 1 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6">NGO Information</h2>
                      
                      <div className="grid gap-6 mb-6">
                        <div>
                          <label htmlFor="ngoName" className="block text-sm font-medium text-gray-700 mb-1">
                            NGO Name *
                          </label>
                          <input
                            type="text"
                            id="ngoName"
                            name="ngoName"
                            value={formData.ngoName}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter your organization name"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-1">
                            Registration Number *
                          </label>
                          <input
                            type="text"
                            id="registrationNumber"
                            name="registrationNumber"
                            value={formData.registrationNumber}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter NGO registration number"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500">This will be used for verification purposes only.</p>
                        </div>
                        
                        <div>
                          <label htmlFor="cause" className="block text-sm font-medium text-gray-700 mb-1">
                            Primary Cause *
                          </label>
                          <select
                            id="cause"
                            name="cause"
                            value={formData.cause}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          >
                            <option value="" disabled>Select your primary cause</option>
                            {NGO_CAUSES.map((cause) => (
                              <option key={cause} value={cause}>{cause}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                            Website (Optional)
                          </label>
                          <input
                            type="url"
                            id="website"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g. https://yourorganization.org"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="established" className="block text-sm font-medium text-gray-700 mb-1">
                              Established Date (Optional)
                            </label>
                            <input
                              type="date"
                              id="established"
                              name="established"
                              value={formData.established}
                              onChange={handleChange}
                              className="w-full rounded-lg border border-gray-300 p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="reachCount" className="block text-sm font-medium text-gray-700 mb-1">
                              People Reached Annually (Optional)
                            </label>
                            <input
                              type="number"
                              id="reachCount"
                              name="reachCount"
                              value={formData.reachCount}
                              onChange={handleChange}
                              className="w-full rounded-lg border border-gray-300 p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="e.g. 5000"
                              min="1"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Organization Description (Optional)
                          </label>
                          <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Tell us about your organization and how you help reduce food waste..."
                            rows={4}
                          ></textarea>
                        </div>
                      </div>
                      
                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Next: Images
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 2: Image Upload */}
                  {step === 2 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6">NGO Images</h2>
                      
                      <div className="grid gap-8 mb-6">
                        <div>
                          <label htmlFor="profile-image" className="block text-sm font-medium text-gray-700 mb-1">
                            NGO Profile Image *
                          </label>
                          <div className="mt-1 flex items-center">
                            <div className="w-32 h-32 rounded-lg border border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center relative">
                              {profileImage ? (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={URL.createObjectURL(profileImage)}
                                    alt="Profile preview"
                                    className="object-cover"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 300px"
                                  />
                                </div>
                              ) : profileImageURL ? (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={profileImageURL}
                                    alt="Profile"
                                    className="object-cover"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 300px"
                                  />
                                </div>
                              ) : (
                                <FiImage className="text-gray-400 text-2xl" />
                              )}
                            </div>
                            <label htmlFor="profile-image-upload" className="ml-5 cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                              {profileImage || profileImageURL ? 'Change' : 'Upload'}
                              <input
                                id="profile-image-upload"
                                name="profile-image"
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={handleImageSelect(setProfileImage)}
                              />
                            </label>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">This will be your NGO profile image.</p>
                        </div>
                        
                        <div>
                          <MultiImageUploader 
                            label="NGO Gallery Images (Optional)"
                            onChange={handleGalleryImagesChange} 
                            maxFiles={6}
                            placeholderText="Upload images of your initiatives, community work, etc."
                          />
                          <p className="mt-1 text-xs text-gray-500">Upload up to 6 images of your organization, events, or impact.</p>
                        </div>
                        
                        <div>
                          <label htmlFor="payment-qr" className="block text-sm font-medium text-gray-700 mb-1">
                            Donation QR Code (Optional)
                          </label>
                          <div className="mt-1 flex items-center">
                            <div className="w-32 h-32 rounded-lg border border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center relative">
                              {paymentQRImage ? (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={URL.createObjectURL(paymentQRImage)}
                                    alt="QR Code preview"
                                    className="object-contain"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 300px"
                                  />
                                </div>
                              ) : paymentQRImageURL ? (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={paymentQRImageURL}
                                    alt="QR Code"
                                    className="object-contain"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 300px"
                                  />
                                </div>
                              ) : (
                                <FiImage className="text-gray-400 text-2xl" />
                              )}
                            </div>
                            <label htmlFor="qr-image-upload" className="ml-5 cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                              {paymentQRImage || paymentQRImageURL ? 'Change' : 'Upload'}
                              <input
                                id="qr-image-upload"
                                name="qr-image"
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={handleImageSelect(setPaymentQRImage)}
                              />
                            </label>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Upload your PhonePe or Google Pay QR code for receiving donations</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          disabled={saving}
                          className={`px-6 py-3 border border-gray-300 rounded-lg text-gray-700 transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        >
                          Back
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleNextStep}
                          disabled={uploading || saving}
                          className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                            uploading || saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                          }`}
                        >
                          {uploading ? (
                            <>
                              <span className="inline-block animate-spin mr-2">⟳</span> Uploading...
                            </>
                          ) : (
                            'Next: Payment'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {step === 3 && success && (
                    <div className="p-10 text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiCheck className="text-green-600 text-2xl" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Upgraded Successfully!</h2>
                      <p className="text-gray-600 mb-6">Your account has been upgraded to an NGO Account.</p>
                      <p className="text-gray-500 text-sm">Redirecting to your profile...</p>
                    </div>
                  )}
                  
                  {/* Payment Modal */}
                  {showPayment && (
                    <PaymentProcessor
                      amount={999}
                      accountType="ngo"
                      onSuccess={handlePaymentSuccess}
                      onCancel={handlePaymentCancel}
                    />
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default NGOUpgradePage;
