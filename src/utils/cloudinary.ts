// Cloudinary utility functions for image upload
// Using direct URL construction instead of SDK for client-side usage

// This function is kept for reference but commented out as it's not currently used
// const getCloudinaryDomain = () => {
//   const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
//   return `https://res.cloudinary.com/${cloudName}`;
// };

// Build Cloudinary URL for an image
export const getCloudinaryUrl = (publicId: string, transformations: Record<string, string | number> = {}) => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const transformationStr = Object.entries(transformations)
    .map(([key, value]) => `${key}_${value}`)
    .join(',');
    
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationStr ? transformationStr + '/' : ''}${publicId}`;
};

// Get the Cloudinary upload preset URL
export const getCloudinaryUploadUrl = () => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
};

// Upload an image to Cloudinary using upload preset
export const uploadToCloudinary = async (file: File): Promise<string> => {
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset!);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image to Cloudinary');
    }
    
    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

// Upload multiple images to Cloudinary
export const uploadMultipleToCloudinary = async (files: File[]): Promise<string[]> => {
  try {
    const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple files to Cloudinary:', error);
    throw error;
  }
};
