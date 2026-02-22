/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com',  // Google user profile images
      'res.cloudinary.com',         // Cloudinary images
      'firebasestorage.googleapis.com', // Firebase Storage
      'storage.googleapis.com',     // Additional Firebase domain
      'images.unsplash.com'         // Unsplash images
    ],
  },
};

module.exports = nextConfig;
