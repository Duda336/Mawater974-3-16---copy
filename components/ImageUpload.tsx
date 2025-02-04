'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  carId: number;
  currentImageUrl: string | null;
  onImageUploaded: (url: string) => void;
}

export default function ImageUpload({ carId, currentImageUrl, onImageUploaded }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setUploading(true);
      setError(null);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${carId}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('car-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('car-images')
        .getPublicUrl(filePath);

      // Update car record with new image URL
      const { error: updateError } = await supabase
        .from('cars')
        .update({ image_url: publicUrl })
        .eq('id', carId);

      if (updateError) {
        throw updateError;
      }

      onImageUploaded(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <div className="w-20 h-20 relative rounded-lg overflow-hidden">
        <Image
          src={currentImageUrl || '/placeholder-car.svg'}
          alt="Car image"
          fill
          className="object-cover"
          sizes="80px"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200">
          <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
            <span className="sr-only">Upload image</span>
            <svg
              className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
      </div>
      {uploading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-qatar-maroon border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}
