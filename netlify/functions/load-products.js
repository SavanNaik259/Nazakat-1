/**
 * Netlify Function: Load Products (Generic)
 * 
 * Loads products from Firebase Storage using direct CDN URLs for optimal caching
 * Handles GET requests to /.netlify/functions/load-products?category=CATEGORY
 * 
 * Uses direct Firebase Storage URLs with alt=media to ensure proper CDN caching,
 * avoiding the bandwidth consumption issues that occur with signed URLs or Admin SDK downloads.
 */

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed'
      })
    };
  }

  try {
    // Get category from query parameters
    const category = event.queryStringParameters?.category;
    const cacheBust = event.queryStringParameters?.cacheBust;
    const ifNoneMatch = event.headers['if-none-match']; // Client ETag for 304 responses

    if (!category) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          products: [],
          error: 'Category parameter is required',
          message: 'Please provide a category parameter: ?category=featured-collection'
        })
      };
    }

    // Detect if this is a cache-busting request from admin panel
    const isCacheBust = !!cacheBust;
    if (isCacheBust) {
      console.log(`Loading ${category} products with cache busting (${cacheBust}) for admin panel...`);
      // Add cache-busting headers for admin panel requests
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    } else {
      console.log(`Loading ${category} products from Cloud Storage...`);
    }

    // Use direct Firebase Storage URL with alt=media for CDN caching
    // Check if this is a bandwidth test category
    const isBandwidthTest = category.startsWith('bandwidth-test-');
    let storageUrl;
    
    if (isBandwidthTest) {
      storageUrl = `https://firebasestorage.googleapis.com/v0/b/auric-a0c92.firebasestorage.app/o/bandwidthTest%2F${category}-products.json?alt=media`;
    } else {
      // Use the correct path structure for your Firebase Storage
      storageUrl = `https://firebasestorage.googleapis.com/v0/b/auric-a0c92.firebasestorage.app/o/productData%2F${category}-products.json?alt=media`;
    }
    
    // Add cache busting to Firebase Storage URL for admin panel requests
    if (isCacheBust) {
      storageUrl += `&fbCacheBust=${cacheBust}`;
      console.log(`Fetching with cache busting from Firebase Storage: ${storageUrl}`);
    } else {
      console.log(`Fetching from Firebase Storage CDN: ${storageUrl}`);
    }

    // Use fetch to get the file from Firebase Storage CDN
    const fetchOptions = isCacheBust ? {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Cache-Bust': `${Date.now()}`  // Force cache invalidation
      }
    } : {};
    
    const response = await fetch(storageUrl, fetchOptions);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`No ${category} products file found in Firebase Storage`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            products: [],
            message: `No ${category} products found - add some through the admin panel`
          })
        };
      }
      throw new Error(`Failed to fetch from Firebase Storage: ${response.status}`);
    }

    const products = await response.json();

    // Get cache headers from Firebase Storage response to pass through
    const cacheControl = response.headers.get('cache-control') || response.headers.get('Cache-Control');
    const etag = response.headers.get('etag') || response.headers.get('ETag');

    console.log(`Cache-Control: ${cacheControl}, ETag: ${etag}`);

    // Check if client has the same version (304 Not Modified)
    if (!isCacheBust && etag && ifNoneMatch === etag) {
      console.log(`Client has current version (ETag match), returning 304 Not Modified`);
      return {
        statusCode: 304,
        headers: {
          ...headers,
          'ETag': etag,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=31536000'
        }
      };
    }

    console.log(`Successfully loaded ${products.length} ${category} products from Firebase Storage CDN`);

    // Set proper CDN cache headers for Netlify CDN caching
    const responseHeaders = {
      ...headers
    };

    // For cache-busting requests, prevent all caching
    if (isCacheBust) {
      responseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      responseHeaders['Pragma'] = 'no-cache';
      responseHeaders['Expires'] = '0';
    } else {
      // For normal requests, set optimized CDN caching with proper ETag validation
      // Use shorter max-age with stale-while-revalidate for better performance
      responseHeaders['Cache-Control'] = 'public, max-age=86400, stale-while-revalidate=31536000, stale-if-error=31536000'; // 1 day cache, 1 year stale
      responseHeaders['Netlify-CDN-Cache-Control'] = 'public, max-age=31536000, durable, stale-while-revalidate=31536000'; // Netlify CDN specific with longer cache
      
      // Generate consistent ETag based on product data to ensure proper cache validation
      if (etag) {
        responseHeaders['ETag'] = etag;
        console.log(`Using original Firebase ETag: ${etag}`);
      } else {
        // Generate fallback ETag from products hash if Firebase doesn't provide one
        const productHash = require('crypto').createHash('md5').update(JSON.stringify(products)).digest('hex');
        responseHeaders['ETag'] = `"${productHash}"`;
        console.log(`Generated fallback ETag: ${responseHeaders['ETag']}`);
      }
      
      // Add immutable directive for better CDN caching
      responseHeaders['Cache-Control'] += ', immutable';
    }

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        success: true,
        products: Array.isArray(products) ? products : [],
        message: `Loaded ${products.length} ${category} products from Firebase Storage CDN`
      })
    };

  } catch (error) {
    console.error(`Error loading ${category || 'unknown'} products:`, error);

    // Return proper error response without fallback products
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        products: [],
        error: `Failed to load products: ${error.message}`,
        message: 'Please check Firebase configuration and try again'
      })
    };
  }
};