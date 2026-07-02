#!/usr/bin/env node

/**
 * Image Migration Script
 * 
 * This script helps migrate image URLs from Lovable CDN to Supabase Storage.
 * 
 * Usage:
 *   npx ts-node src/lib/migrate-images.ts
 * 
 * Steps:
 * 1. Downloads images from Lovable CDN
 * 2. Uploads to Supabase Storage buckets
 * 3. Updates database with new paths
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import https from 'https';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Download file from URL
 */
async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Extract filename from Lovable asset URL
 */
function extractFilename(url: string): string {
  const lastSlash = url.lastIndexOf('/');
  return url.substring(lastSlash + 1);
}

/**
 * Migrate vendor logos
 */
async function migrateVendorLogos() {
  console.log('\n📦 Migrating vendor logos...');
  
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id, logo_url')
    .like('logo_url', '%/__l5e/%');

  if (error) {
    console.error('❌ Error fetching vendors:', error.message);
    return;
  }

  console.log(`Found ${vendors?.length || 0} vendors with Lovable logos`);

  for (const vendor of vendors || []) {
    try {
      if (!vendor.logo_url) continue;

      const filename = extractFilename(vendor.logo_url);
      console.log(`  Uploading: ${filename}`);

      // Download from Lovable CDN
      const fileBuffer = await downloadFile(vendor.logo_url);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vendor-logos')
        .upload(filename, fileBuffer, { upsert: true });

      if (uploadError) {
        console.error(`    ❌ Upload failed: ${uploadError.message}`);
        continue;
      }

      // Update database with new path
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ logo_url: filename })
        .eq('id', vendor.id);

      if (updateError) {
        console.error(`    ❌ DB update failed: ${updateError.message}`);
        continue;
      }

      console.log(`    ✅ Done`);
    } catch (err) {
      console.error(`    ❌ Error:`, err instanceof Error ? err.message : String(err));
    }
  }
}

/**
 * Migrate vendor covers
 */
async function migrateVendorCovers() {
  console.log('\n📦 Migrating vendor covers...');
  
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id, cover_url')
    .like('cover_url', '%/__l5e/%');

  if (error) {
    console.error('❌ Error fetching vendors:', error.message);
    return;
  }

  console.log(`Found ${vendors?.length || 0} vendors with Lovable covers`);

  for (const vendor of vendors || []) {
    try {
      if (!vendor.cover_url) continue;

      const filename = extractFilename(vendor.cover_url);
      console.log(`  Uploading: ${filename}`);

      const fileBuffer = await downloadFile(vendor.cover_url);

      const { error: uploadError } = await supabase.storage
        .from('vendor-covers')
        .upload(filename, fileBuffer, { upsert: true });

      if (uploadError) {
        console.error(`    ❌ Upload failed: ${uploadError.message}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('vendors')
        .update({ cover_url: filename })
        .eq('id', vendor.id);

      if (updateError) {
        console.error(`    ❌ DB update failed: ${updateError.message}`);
        continue;
      }

      console.log(`    ✅ Done`);
    } catch (err) {
      console.error(`    ❌ Error:`, err instanceof Error ? err.message : String(err));
    }
  }
}

/**
 * Migrate category images
 */
async function migrateCategoryImages() {
  console.log('\n📦 Migrating category images...');
  
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, image_url')
    .like('image_url', '%/__l5e/%');

  if (error) {
    console.error('❌ Error fetching categories:', error.message);
    return;
  }

  console.log(`Found ${categories?.length || 0} categories with Lovable images`);

  for (const category of categories || []) {
    try {
      if (!category.image_url) continue;

      const filename = extractFilename(category.image_url);
      console.log(`  Uploading: ${filename}`);

      const fileBuffer = await downloadFile(category.image_url);

      const { error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(filename, fileBuffer, { upsert: true });

      if (uploadError) {
        console.error(`    ❌ Upload failed: ${uploadError.message}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('categories')
        .update({ image_url: filename })
        .eq('id', category.id);

      if (updateError) {
        console.error(`    ❌ DB update failed: ${updateError.message}`);
        continue;
      }

      console.log(`    ✅ Done`);
    } catch (err) {
      console.error(`    ❌ Error:`, err instanceof Error ? err.message : String(err));
    }
  }
}

/**
 * Migrate banner images
 */
async function migrateBannerImages() {
  console.log('\n📦 Migrating banner images...');
  
  const { data: banners, error } = await supabase
    .from('banners')
    .select('id, image_url')
    .like('image_url', '%/__l5e/%');

  if (error) {
    console.error('❌ Error fetching banners:', error.message);
    return;
  }

  console.log(`Found ${banners?.length || 0} banners with Lovable images`);

  for (const banner of banners || []) {
    try {
      if (!banner.image_url) continue;

      const filename = extractFilename(banner.image_url);
      console.log(`  Uploading: ${filename}`);

      const fileBuffer = await downloadFile(banner.image_url);

      const { error: uploadError } = await supabase.storage
        .from('banner-images')
        .upload(filename, fileBuffer, { upsert: true });

      if (uploadError) {
        console.error(`    ❌ Upload failed: ${uploadError.message}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('banners')
        .update({ image_url: filename })
        .eq('id', banner.id);

      if (updateError) {
        console.error(`    ❌ DB update failed: ${updateError.message}`);
        continue;
      }

      console.log(`    ✅ Done`);
    } catch (err) {
      console.error(`    ❌ Error:`, err instanceof Error ? err.message : String(err));
    }
  }
}

/**
 * Main migration
 */
async function main() {
  console.log('🚀 Starting image migration from Lovable CDN to Supabase Storage\n');
  console.log(`📍 Supabase Project: ${SUPABASE_URL}\n`);

  try {
    // First, verify buckets exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error accessing storage:', bucketsError.message);
      console.log('\n📝 Make sure to create these buckets first:');
      console.log('  - vendor-logos');
      console.log('  - vendor-covers');
      console.log('  - category-images');
      console.log('  - banner-images');
      console.log('  - product-images');
      process.exit(1);
    }

    const requiredBuckets = ['vendor-logos', 'vendor-covers', 'category-images', 'banner-images', 'product-images'];
    const existingBuckets = (buckets || []).map(b => b.name);
    const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b));

    if (missingBuckets.length > 0) {
      console.error('❌ Missing buckets:');
      missingBuckets.forEach(b => console.error(`  - ${b}`));
      console.log('\n📝 Create them in Supabase Dashboard → Storage');
      process.exit(1);
    }

    console.log('✅ All required buckets exist\n');

    // Run migrations
    await migrateVendorLogos();
    await migrateVendorCovers();
    await migrateCategoryImages();
    await migrateBannerImages();

    console.log('\n✅ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Verify images load on your local site: npm run dev');
    console.log('  2. Deploy to Vercel: git push');
    console.log('  3. Test images on Vercel deployment');

  } catch (err) {
    console.error('\n❌ Migration failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
