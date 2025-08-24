
/**
 * Netlify Function: Upload Products
 * 
 * Handles uploading product JSON files to Firebase Storage
 * Supports the new multi-image product data structure
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let adminApp;
try {
  // Check if default app already exists
  adminApp = admin.app();
  console.log('Using existing Firebase Admin app for upload');
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
      console.log('Initialized new Firebase Admin app for upload');
    } catch (initError) {
      console.error('Firebase Admin initialization error:', initError);
    }
  } else {
    console.error('Firebase Admin app error:', error);
  }
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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
    // Parse multipart form data
    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('Content-Type must be multipart/form-data');
    }

    // For simplicity, we'll parse the base64 body manually
    // In a production environment, you might want to use a library like busboy
    const body = Buffer.from(event.body, 'base64').toString();
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      throw new Error('No boundary found in Content-Type');
    }

    // Parse the multipart data to extract the file
    const parts = body.split(`--${boundary}`);
    let fileContent = '';
    let fileName = '';

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data') && part.includes('filename=')) {
        const lines = part.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('filename=')) {
            fileName = lines[i].match(/filename="([^"]+)"/)?.[1] || '';
          }
          if (lines[i].trim() === '' && i + 1 < lines.length) {
            // File content starts after empty line
            fileContent = lines.slice(i + 1).join('\n').replace(/\r?\n$/, '');
            break;
          }
        }
        break;
      }
    }

    if (!fileName || !fileContent) {
      throw new Error('No file found in request');
    }

    console.log(`Uploading file: ${fileName}`);

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(`productData/${fileName}`);

    await file.save(fileContent, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=2592000' // 30 days cache
      }
    });

    console.log(`File uploaded successfully: ${fileName}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Products uploaded successfully',
        filename: fileName
      })
    };

  } catch (error) {
    console.error('Error uploading products:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to upload products'
      })
    };
  }
};
