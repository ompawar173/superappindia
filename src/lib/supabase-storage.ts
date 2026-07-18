import { supabase } from '@/integrations/supabase/client';

/**
 * Get public URL for a file in Supabase Storage
 * @param bucket - Storage bucket name (e.g., 'vendor-covers', 'vendor-logos', 'product-images')
 * @param path - Path to file in bucket
 * @returns Public URL or fallback if invalid
 */
export function getSupabaseStorageUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;

  // Already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Lovable CDN asset URL — serve as-is (works in preview and production)
  if (path.startsWith('/__l5e/')) {
    return path;
  }


  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data?.publicUrl || null;
  } catch (error) {
    console.error(`[Supabase Storage] Error getting URL for ${bucket}/${path}:`, error);
    return null;
  }
}

/**
 * Get public URL for vendor cover image
 */
export function getVendorCoverUrl(coverPath: string | null): string | null {
  return getSupabaseStorageUrl('vendor-covers', coverPath);
}

/**
 * Get public URL for vendor logo
 */
export function getVendorLogoUrl(logoPath: string | null): string | null {
  return getSupabaseStorageUrl('vendor-logos', logoPath);
}

/**
 * Get public URL for product image
 */
export function getProductImageUrl(imagePath: string | null): string | null {
  return getSupabaseStorageUrl('product-images', imagePath);
}

/**
 * Get public URL for category image
 */
export function getCategoryImageUrl(imagePath: string | null): string | null {
  return getSupabaseStorageUrl('category-images', imagePath);
}

/**
 * Get public URL for banner image
 */
export function getBannerImageUrl(imagePath: string | null): string | null {
  return getSupabaseStorageUrl('banner-images', imagePath);
}
