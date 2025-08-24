/**
 * Netlify Function: Update Product Stock
 * Updates product stock in Firebase Storage after order placement
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "auric-a0c92",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "auric-a0c92.firebasestorage.app"
    });

    console.log('Firebase Admin initialized for stock updates');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
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
    const requestData = JSON.parse(event.body);
    const { category, products, productId, previousStock, newStock, quantityReduced } = requestData;

    if (!category || !products || !productId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: category, products, productId'
        })
      };
    }

    console.log(`Updating stock for product ${productId} in category ${category}`);
    console.log(`Stock change: ${previousStock} -> ${newStock} (reduced by ${quantityReduced})`);

    // Get Firebase Storage bucket
    const bucket = admin.storage().bucket();
    const filePath = `productData/${category}-products.json`;
    const file = bucket.file(filePath);

    // Upload updated products data to Firebase Storage
    const updatedData = JSON.stringify(products, null, 2);
    
    await file.save(updatedData, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=2592000', // 30 days cache
        customMetadata: {
          lastStockUpdate: new Date().toISOString(),
          updatedProduct: productId,
          stockChange: `${previousStock}->${newStock}`
        }
      }
    });

    console.log(`Successfully updated ${category} products file with new stock for ${productId}`);

    // Log stock update for audit trail
    try {
      const auditLog = {
        timestamp: new Date().toISOString(),
        action: 'stock_update',
        productId: productId,
        category: category,
        previousStock: previousStock,
        newStock: newStock,
        quantityReduced: quantityReduced,
        source: 'order_placement'
      };

      // Save audit log to Firebase Storage
      const auditFile = bucket.file(`stockLogs/stock-update-${Date.now()}-${productId}.json`);
      await auditFile.save(JSON.stringify(auditLog, null, 2), {
        metadata: {
          contentType: 'application/json'
        }
      });

      console.log('Stock update audit log saved successfully');
    } catch (auditError) {
      console.error('Error saving audit log:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Stock updated successfully for product ${productId}`,
        productId: productId,
        previousStock: previousStock,
        newStock: newStock,
        quantityReduced: quantityReduced,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error updating product stock:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Failed to update product stock: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    };
  }
};