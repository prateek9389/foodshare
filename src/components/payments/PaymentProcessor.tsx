import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiX, FiCreditCard, FiAlertTriangle } from 'react-icons/fi';
import Image from 'next/image';
import { SiPhonepe, SiGooglepay } from 'react-icons/si';

interface PaymentProcessorProps {
  amount: number;
  accountType: 'business' | 'ngo';
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ 
  amount, 
  accountType, 
  onSuccess, 
  onCancel 
}) => {
  const [step, setStep] = useState<'method' | 'qr' | 'processing' | 'success'>('method');
  const [paymentMethod, setPaymentMethod] = useState<'phonepe' | 'googlepay' | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processingTimeout, setProcessingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Success sound effect for payment
  useEffect(() => {
    const audio = new Audio('/sounds/payment-success.mp3');
    
    // Preload the audio
    audio.load();
    
    // Play the audio when the payment is successful
    if (step === 'success') {
      audio.play().catch(e => console.error('Error playing sound:', e));
    }
    
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [step]);

  // Cleanup timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [processingTimeout]);

  const handleSelectPaymentMethod = (method: 'phonepe' | 'googlepay') => {
    setPaymentMethod(method);
    setStep('qr');
  };

  const handleStartPayment = () => {
    setError(null);
    setProcessingProgress(0);
    setStep('processing');
    
    // Simulate payment processing with progress
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
    
    // Simulate successful payment after a delay
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setProcessingProgress(100);
      setStep('success');
      
      // Call the onSuccess callback after showing the success screen for a moment
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }, 5000);
    
    setProcessingTimeout(timeout);
  };

  const handleCancel = () => {
    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }
    onCancel();
  };

  const paymentQR = `/images/${paymentMethod}-qr.png`;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-xl shadow-xl overflow-hidden max-w-md w-full mx-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white relative">
            <button 
              onClick={handleCancel}
              className="absolute right-4 top-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1"
            >
              <FiX size={20} />
            </button>
            <h2 className="text-xl font-bold">Upgrade to {accountType === 'business' ? 'Business' : 'NGO'} Account</h2>
            <p className="opacity-90 text-sm">Complete your payment to unlock premium features</p>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {step === 'method' && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="text-2xl font-bold text-gray-800">₹{amount.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">One-time payment for account upgrade</div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-gray-600 text-sm mb-2">Select a payment method:</p>
                  
                  <button
                    onClick={() => handleSelectPaymentMethod('phonepe')}
                    className="w-full p-4 border border-gray-200 rounded-lg flex items-center hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-purple-100 rounded-full mr-3">
                      <SiPhonepe className="text-purple-600 text-xl" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-800">PhonePe</h3>
                      <p className="text-xs text-gray-500">Pay using PhonePe UPI</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleSelectPaymentMethod('googlepay')}
                    className="w-full p-4 border border-gray-200 rounded-lg flex items-center hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-full mr-3">
                      <SiGooglepay className="text-blue-600 text-xl" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-800">Google Pay</h3>
                      <p className="text-xs text-gray-500">Pay using Google Pay UPI</p>
                    </div>
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  This is a demo payment. No actual charges will be made.
                </div>
              </div>
            )}
            
            {step === 'qr' && (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100">
                    {paymentMethod === 'phonepe' ? (
                      <SiPhonepe className="text-purple-600 text-xl" />
                    ) : (
                      <SiGooglepay className="text-blue-600 text-xl" />
                    )}
                  </div>
                </div>
                
                <h3 className="font-medium text-gray-800">
                  Scan QR code with {paymentMethod === 'phonepe' ? 'PhonePe' : 'Google Pay'}
                </h3>
                
                <div className="p-3 bg-white border border-gray-200 rounded-lg inline-block mx-auto">
                  <div className="relative w-full h-full">
                    <Image src={paymentQR} alt="Payment QR Code" className="object-contain" fill sizes="(max-width: 768px) 100vw, 300px" />
                  </div>
                </div>
                
                <div className="text-gray-500 text-sm">
                  Amount: <span className="font-medium">₹{amount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-center space-x-3 pt-2">
                  <button
                    onClick={() => setStep('method')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  
                  <button
                    onClick={handleStartPayment}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    I&apos;ve Paid
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 mt-4">
                  This is a demo QR code. For testing purposes, click &quot;I&apos;ve Paid&quot; to simulate payment.
                </div>
              </div>
            )}
            
            {step === 'processing' && (
              <div className="py-6 text-center space-y-4">
                <div className="flex justify-center mb-2">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-r-transparent animate-spin"></div>
                    <FiCreditCard className="text-blue-500 text-2xl" />
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-800">Processing Payment</h3>
                <p className="text-sm text-gray-500">Please wait while we verify your payment...</p>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                
                {error && (
                  <div className="text-red-500 text-sm flex items-center justify-center mt-4">
                    <FiAlertTriangle className="mr-1" /> {error}
                  </div>
                )}
              </div>
            )}
            
            {step === 'success' && (
              <div className="py-8 text-center space-y-4">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 15 
                  }}
                  className="flex justify-center mb-4"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <FiCheckCircle className="text-green-600 text-4xl" />
                  </div>
                </motion.div>
                
                <h3 className="text-xl font-bold text-gray-800">Payment Successful!</h3>
                <p className="text-gray-600">
                  Your account has been upgraded to {accountType === 'business' ? 'Business' : 'NGO'} successfully.
                </p>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-gray-500 mt-2"
                >
                  Redirecting you to your profile...
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentProcessor;
