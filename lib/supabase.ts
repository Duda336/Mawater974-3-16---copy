import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Add some debug logging
console.log('Supabase initialization:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export async function uploadCarImage(file: File, path: string) {
  const { data, error } = await supabase.storage
    .from('car-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data;
}

export async function uploadBrandLogo(file: File, path: string) {
  const { data, error } = await supabase.storage
    .from('brand-logos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data;
}

export function getCarImageUrl(path: string) {
  const { data } = supabase.storage
    .from('car-images')
    .getPublicUrl(path);
  
  return data.publicUrl;
}

export function getBrandLogoUrl(path: string) {
  const { data } = supabase.storage
    .from('brand-logos')
    .getPublicUrl(path);
  
  return data.publicUrl;
}
