import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface MultiImageUploaderProps {
  onChange: (files: File[]) => void;
  label: string;
  maxFiles?: number;
  placeholderText?: string;
  acceptedFileTypes?: string;
  className?: string;
}

const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({
  onChange,
  label,
  maxFiles = 5,
  placeholderText = 'Drag and drop images here, or click to browse',
  acceptedFileTypes = 'image/*',
  className = '',
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: File[] = [];
      const newPreviews: string[] = [];

      Array.from(selectedFiles).forEach((file) => {
        if (files.length + newFiles.length < maxFiles) {
          newFiles.push(file);
          const previewUrl = URL.createObjectURL(file);
          newPreviews.push(previewUrl);
        }
      });

      if (newFiles.length > 0) {
        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        setPreviews([...previews, ...newPreviews]);
        onChange(updatedFiles);
      }
    },
    [files, maxFiles, onChange, previews]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileChange(e.dataTransfer.files);
    },
    [handleFileChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = [...files];
      const newPreviews = [...previews];

      // Release the object URL to free memory
      URL.revokeObjectURL(newPreviews[index]);

      newFiles.splice(index, 1);
      newPreviews.splice(index, 1);

      setFiles(newFiles);
      setPreviews(newPreviews);
      onChange(newFiles);
    },
    [files, onChange, previews]
  );

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="flex flex-wrap gap-3 mb-4">
          <AnimatePresence>
            {previews.map((preview, index) => (
              <motion.div
                key={preview}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="w-24 h-24 overflow-hidden rounded-lg border border-gray-200">
                  <div className="relative w-full h-full">
                    <Image
                      src={preview}
                      alt={`Preview ${index}`}
                      className="object-cover rounded-md"
                      fill
                      sizes="(max-width: 768px) 100vw, 150px"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiX size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {files.length < maxFiles && (
            <motion.label
              htmlFor="image-upload"
              className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <FiUpload className="mb-1" size={20} />
              <span className="text-xs text-center">Add</span>
            </motion.label>
          )}
        </div>

        {files.length === 0 && (
          <div className="text-center py-8">
            <FiImage className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-sm text-gray-500">{placeholderText}</p>
            <p className="text-xs text-gray-400 mt-1">
              Maximum {maxFiles} image{maxFiles !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <input
          id="image-upload"
          type="file"
          multiple
          accept={acceptedFileTypes}
          onChange={(e) => handleFileChange(e.target.files)}
          className="sr-only"
        />
      </div>
    </div>
  );
};

export default MultiImageUploader;
