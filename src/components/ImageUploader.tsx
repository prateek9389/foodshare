'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiX, FiImage } from 'react-icons/fi';
import { uploadMultipleToCloudinary } from '../utils/cloudinary';

interface ImageUploaderProps {
  onImagesUploaded: (urls: string[]) => void;
  maxImages?: number;
  initialImages?: string[];
  disabled?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesUploaded,
  maxImages = 5,
  initialImages = [],
  disabled = false,
}) => {
  const [uploadedImages, setUploadedImages] = useState<string[]>(initialImages);
  const [previewImages, setPreviewImages] = useState<string[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the max allowed
    if (uploadedImages.length + files.length > maxImages) {
      setError(`You can only upload a maximum of ${maxImages} images.`);
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create temporary URL for preview
      const newPreviewImages = Array.from(files).map(file => URL.createObjectURL(file));
      setPreviewImages([...previewImages, ...newPreviewImages]);

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to Cloudinary
      const imageUrls = await uploadMultipleToCloudinary(Array.from(files));
      
      clearInterval(interval);
      setUploadProgress(100);
      
      // Update state with the new image URLs
      const newUploadedImages = [...uploadedImages, ...imageUrls];
      setUploadedImages(newUploadedImages);
      
      // Call parent callback with all image URLs
      onImagesUploaded(newUploadedImages);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reset progress after a brief delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload images. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newUploadedImages = [...uploadedImages];
    newUploadedImages.splice(index, 1);
    setUploadedImages(newUploadedImages);

    const newPreviewImages = [...previewImages];
    newPreviewImages.splice(index, 1);
    setPreviewImages(newPreviewImages);

    // Call parent callback with updated image URLs
    onImagesUploaded(newUploadedImages);
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-4">
        {previewImages.map((imgSrc, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative w-24 h-24 rounded-md overflow-hidden border border-gray-200"
          >
            <Image
              src={imgSrc}
              alt={`Uploaded image ${index + 1}`}
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-1 right-1 bg-black bg-opacity-60 rounded-full p-1 text-white hover:bg-opacity-80 transition-opacity"
              disabled={disabled || isUploading}
            >
              <FiX size={12} />
            </button>
          </motion.div>
        ))}

        {uploadedImages.length < maxImages && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleUploadClick}
            className={`w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-md 
              ${disabled ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-green-300 text-green-500 hover:border-green-500 cursor-pointer'}`}
            disabled={disabled || isUploading}
          >
            <FiImage size={24} />
            <span className="text-xs mt-1">Add Image</span>
          </motion.button>
        )}
      </div>

      {isUploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled || isUploading || uploadedImages.length >= maxImages}
      />

      <div className="text-xs text-gray-500 mt-1">
        {uploadedImages.length} of {maxImages} images uploaded. <span className="font-medium">PNG, JPG or JPEG</span> up to 5MB each.
      </div>
    </div>
  );
};

export default ImageUploader;
