/**
 * Netlify Function Image Proxy with CDN Caching
 * 
 * This function serves as a proxy between Firebase Storage and your users,
 * implementing proper CDN caching to reduce Firebase Storage bandwidth costs.
 * 
 * Features:
 * - Fetches images from Firebase Storage
 * - Implements long-term CDN caching with Cache-Control headers
 * - Uses Netlify's durable cache for persistence across deploys
 * - Handles binary content correctly with base64 encoding
 * - Provides proper error handling for missing images
 * 
 * Usage: /.netlify/functions/image-proxy?path=productImages/image.jpg
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let adminApp;
try {
  // Check if default app already exists
  adminApp = admin.app();
  console.log('Using existing Firebase Admin app');
} catch (error) {
  if (error.code === 'app/no-app') {
    // Initialize new app only if it doesn't exist
    try {
      // Use environment variables for Firebase Admin credentials
      const serviceAccount = {
        type: 'service_account',
        project_id: 'auric-a0c92',
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '067bc566a907eeca7ae57d98ec6ba463385b2617',
        private_key: (process.env.FIREBASE_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCW1inMXQEJA7c1\nzhYaXL6CIKmSpDcftI6l/tQ33Z0eIPCqACgb3X0uNOm0G8Bquz9Y5n13FLBOU4oH\n+J/BD0kt16VcYG5oxLQVa9xZVVujDM1C7KzFw4ZQztMkYhjjJo5gPrNKpSsT85rx\n8LjU1doGvk/5K1sWS83jeobGtR35PTtQwAG/aOxzm0c48fj4l5/f618UbTpHyUsZ\nG9tklU7RYTTFYELss+PEcGKTQTSrh/RSMug4GaLqbWsOu+AkJaCZGAsTwMc3yLcC\nTAUZCjR104W+WdR3sc5EVh3Dd54pXGeHIWlgyJhiqPWw09lyQ8rJBWfSKYlzJkpe\nbvb879J7AgMBAAECggEAPBpGOXptqSvj2vqtb/+4oZ1mNFpe5LFLjfVGlqQlsRWr\nD/JUCRZuhPTskqnkOCM4kLH3GHYT8oHzJE37SjBPFocxCugZ1oFayJZcDPSoOQYm\n3B32ki7g3F4tX/f+trRsUwlo47uAuMh+2xzyaUx1Pe6ja0PNXcsC1TvDbHZK5T7W\nO+SBvh9RNmmFsqL5eeRdr4t3NPKDHgQ+P49gevkpAzNHcUm4oQt+orniXYcWfAwl\nJtcCla7LSFrAsW89pITcbnTQSadqUXF6LP68NY5xVfZxWBuO+ajVRvpGofZMlkuo\nz8p1JIt7KLnhBdwkQutI4Zll1wZCBcPydX4EC0wd8QKBgQDIbkgjHzSkvHJHLe1X\nY6LxRJmnvXXvP2RKsRDDtHPq0u/JTjHVfeH7Y4546MQX+9/11XEzMX85JUBa/kza\nfCBuT88SYZeEJknpLhUl5IEKg5K9QkRlLimi1saSN/WGBzk7ZP4tslXD632JkDZS\n6ASYYTe8TDXuF8If/CBjhHdU/wKBgQDAp+WXHYR/BxGCvMM5K2qZRqDNACvlcnia\n9xNEmkrgtNGBEPFGrulwP4vtodkBwWnUiipzKUr6eS520baxO9jgdMJ7+bUnTB7L\npeUuGSixIMf0wBvf5OT6FKZ9A6qTc49jd8QD/Vaei8kKS1iCkbOkEwrd7VC1BX8G\nKDBoDJ1WhQKBgQC6aifZ0rpJxaOcJFEtCFSShbVL1+EKhjEnbwwimYF+lHXFC186\nK3y1LWFjf0py7CbfJIfGj3C+m7EBcKfWRcB8GOqFNBOSK3Ju2Bd/SMnkF3+xWyL1\n4DuFYrEJadaHs8w9O69UnRs7v5jhCyobbgRoHXOTRGacbah1yy/sn1XFzQKBgAPX\nlVmVKh5Kasv7rb0HI6IY6X4NIdL6nHMiuEym8xVWJdN4Hge110v4yHadwrEpRU4K\nz1vql+c04XtXJViVg/a9/V7xlO5Ks1aGYXKw58HYkIRODIBDlVlzbfqSRyWXqWVn\nbw5RUBfrW8ALzqET/Mwp4Q6Z/AEQMf9Sb9yzW7PtAoGAJilwi+vA0pNGNlOuKYLj\n8XPYZqktbxs99N0LFPbSIVsVeHwVhoi+KPKgMHuFrQZA22IYJ01acD/LYim3Fi+X\nUD//owCkNu22xWl2SNoBVO3htsGuwokolPBt/MA8mGG+SDR7JJbeDxesfzUWTxHb\nPNWi5ETLiI2OCy1JSmPGq9k=\n-----END PRIVATE KEY-----\n`).replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@auric-a0c92.iam.gserviceaccount.com',
        client_id: process.env.FIREBASE_CLIENT_ID || '112489649638932528471',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.FIREBASE_CERT_URL || 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40auric-a0c92.iam.gserviceaccount.com'
      };

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'auric-a0c92.firebasestorage.app'
      });
      console.log('Initialized new Firebase Admin app');
    } catch (initError) {
      console.error('Firebase Admin initialization error:', initError);
    }
  } else {
    console.error('Firebase Admin app error:', error);
  }
}

const bucket = adminApp ? admin.storage().bucket('auric-a0c92.firebasestorage.app') : null;

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // Enable CORS for all origins
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get the image path from query parameters first
  const imagePath = event.queryStringParameters?.path;

  if (!imagePath) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Missing image path',
        usage: '/.netlify/functions/image-proxy?path=productImages/image.jpg'
      })
    };
  }

  // Check if Firebase is properly initialized
  if (!adminApp || !bucket) {
    console.log('Firebase Admin SDK not configured, proxying image through Netlify CDN');

    try {
      // Fetch image from Firebase Storage and serve through Netlify CDN
      const directUrl = `https://firebasestorage.googleapis.com/v0/b/auric-a0c92.firebasestorage.app/o/${encodeURIComponent(imagePath)}?alt=media`;

      const response = await fetch(directUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      // Serve image through Netlify CDN with proper caching
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
          'Netlify-CDN-Cache-Control': 'public, max-age=31536000, durable', // Netlify CDN specific
        },
        body: Buffer.from(imageBuffer).toString('base64'),
        isBase64Encoded: true
      };

    } catch (error) {
      console.error('Error proxying image:', error);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Image not found',
          path: imagePath,
          details: error.message
        })
      };
    }
  }

  try {
    // Get file reference
    const file = bucket.file(imagePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Image not found',
          path: imagePath
        })
      };
    }

    // Download file content
    const [fileBuffer] = await file.download();
    const [metadata] = await file.getMetadata();

    // Determine content type
    const contentType = metadata.contentType || 'application/octet-stream';

    // Generate cache key based on file metadata
    const lastModified = metadata.updated || metadata.timeCreated;
    const etag = metadata.etag || metadata.md5Hash;

    // Check if client has cached version (ETag validation)
    const clientETag = event.headers['if-none-match'];
    if (clientETag && clientETag === etag) {
      return {
        statusCode: 304,
        headers: {
          ...corsHeaders,
          'ETag': etag,
          'Cache-Control': 'public, max-age=0, must-revalidate',
          'Netlify-CDN-Cache-Control': 'public, max-age=31536000, durable, must-revalidate'
        },
        body: ''
      };
    }

    // Return image with proper caching headers
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'ETag': etag,
        'Last-Modified': new Date(lastModified).toUTCString(),

        // Browser cache: Always revalidate to check for updates
        'Cache-Control': 'public, max-age=0, must-revalidate',

        // CDN cache: Long-term caching with durable storage
        // This is the key to bandwidth savings - CDN serves cached images
        'Netlify-CDN-Cache-Control': 'public, max-age=31536000, durable, must-revalidate',

        // Cache tags for selective invalidation
        'Netlify-Cache-Tag': 'images,firebase-storage',

        // Additional performance headers
        'Vary': 'Accept-Encoding'
      },
      body: fileBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error fetching image from Firebase Storage:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to retrieve image',
        details: error.message
      })
    };
  }
};