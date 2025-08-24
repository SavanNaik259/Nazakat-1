const express = require('express');
const path = require('path');
const cors = require('cors');
const ShiprocketService = require('./services/shiprocket');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Shiprocket service
let shiprocketService = null;
try {
  shiprocketService = new ShiprocketService();
  console.log('Shiprocket service initialized successfully');
} catch (error) {
  console.warn('Shiprocket service not available:', error.message);
  console.log('Server will continue without Shiprocket integration');
}

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies for all routes
app.use(express.json());

// Serve static files from the current directory
app.use(express.static('.'));

// Netlify functions compatibility endpoint
app.get('/.netlify/functions/load-products', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/load-products');
    
    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'GET',
      path: '/.netlify/functions/load-products'
    };
    
    // Create mock context
    const context = {};
    
    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);
    
    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }
    
    // Send response
    res.status(result.statusCode || 200);
    
    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Error in load-products function:', error);
    res.status(500).json({
      success: false,
      products: [],
      error: `Failed to load products: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Delete product endpoint
app.delete('/.netlify/functions/delete-product', async (req, res) => {
  try {
    // Import the Netlify delete function
    const netlifyFunction = require('./netlify/functions/delete-product');
    
    // Create mock Netlify event object
    const event = {
      body: JSON.stringify(req.body),
      headers: req.headers,
      httpMethod: 'DELETE',
      path: '/.netlify/functions/delete-product'
    };
    
    // Create mock context
    const context = {};
    
    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);
    
    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }
    
    // Send response
    res.status(result.statusCode || 200);
    
    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Error in delete-product function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to delete product: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Image proxy endpoint
app.get('/.netlify/functions/image-proxy', async (req, res) => {
  try {
    // Import the Netlify image-proxy function
    const imageProxyFunction = require('./netlify/functions/image-proxy');
    
    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'GET',
      path: '/.netlify/functions/image-proxy'
    };
    
    // Create mock context
    const context = {};
    
    // Call the Netlify function
    const result = await imageProxyFunction.handler(event, context);
    
    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }
    
    // Send response
    res.status(result.statusCode || 200);
    
    if (result.body) {
      // For binary data (images), we need to handle it differently
      if (result.isBase64Encoded) {
        const buffer = Buffer.from(result.body, 'base64');
        res.send(buffer);
      } else {
        try {
          const body = JSON.parse(result.body);
          res.json(body);
        } catch (e) {
          res.send(result.body);
        }
      }
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Error in image-proxy function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to proxy image: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Shiprocket API endpoints

// Create shipment endpoint
app.post('/api/shipping/create-order', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const orderData = req.body;
    console.log('Creating shipment for order:', orderData.order_id);
    
    const result = await shiprocketService.createOrder(orderData);
    
    res.json({
      success: true,
      data: result,
      message: 'Shipment created successfully'
    });

  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create shipment'
    });
  }
});

// Track order endpoint
app.get('/api/shipping/track/:trackingId', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { trackingId } = req.params;
    console.log('Tracking order:', trackingId);
    
    const result = await shiprocketService.trackOrder(trackingId);
    
    res.json({
      success: true,
      data: result,
      message: 'Order tracking retrieved successfully'
    });

  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to track order'
    });
  }
});

// Get courier services endpoint
app.post('/api/shipping/courier-services', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { pickup_postcode, delivery_postcode, weight, cod } = req.body;
    console.log('Getting courier services for:', pickup_postcode, 'to', delivery_postcode);
    
    const result = await shiprocketService.getCourierServices(pickup_postcode, delivery_postcode, weight, cod);
    
    res.json({
      success: true,
      data: result,
      message: 'Courier services retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting courier services:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get courier services'
    });
  }
});

// Generate AWB endpoint
app.post('/api/shipping/generate-awb', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const { shipment_id, courier_id } = req.body;
    console.log('Generating AWB for shipment:', shipment_id, 'with courier:', courier_id);
    
    const result = await shiprocketService.generateAWB(shipment_id, courier_id);
    
    res.json({
      success: true,
      data: result,
      message: 'AWB generated successfully'
    });

  } catch (error) {
    console.error('Error generating AWB:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate AWB'
    });
  }
});

// Get orders endpoint
app.get('/api/shipping/orders', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const page = req.query.page || 1;
    const per_page = req.query.per_page || 10;
    console.log('Getting orders - page:', page, 'per_page:', per_page);
    
    const result = await shiprocketService.getOrders(page, per_page);
    
    res.json({
      success: true,
      data: result,
      message: 'Orders retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get orders'
    });
  }
});

// Test Shiprocket connection endpoint
app.get('/api/shipping/test-connection', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    console.log('Testing Shiprocket connection...');
    
    // Try to authenticate
    await shiprocketService.authenticate();
    
    res.json({
      success: true,
      message: 'Shiprocket connection successful',
      test_mode: true
    });

  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to connect to Shiprocket'
    });
  }
});

// Manual AWB generation endpoint
app.post('/api/shipping/assign-awb', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }
    
    const { shipment_id, courier_id } = req.body;
    
    if (!shipment_id || !courier_id) {
      return res.status(400).json({
        success: false,
        error: 'shipment_id and courier_id are required'
      });
    }
    
    const result = await shiprocketService.generateAWB(shipment_id, courier_id);
    
    res.json({
      success: true,
      data: result,
      message: 'AWB assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning AWB:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to assign AWB'
    });
  }
});

// Schedule pickup endpoint
app.post('/api/shipping/schedule-pickup', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }
    
    const { shipment_id } = req.body;
    
    if (!shipment_id) {
      return res.status(400).json({
        success: false,
        error: 'shipment_id is required'
      });
    }
    
    const result = await shiprocketService.schedulePickup(shipment_id);
    
    res.json({
      success: true,
      data: result,
      message: 'Pickup scheduled successfully'
    });

  } catch (error) {
    console.error('Error scheduling pickup:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to schedule pickup'
    });
  }
});

// Generate label endpoint
app.post('/api/shipping/generate-label', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }
    
    const { shipment_id } = req.body;
    
    if (!shipment_id) {
      return res.status(400).json({
        success: false,
        error: 'shipment_id is required'
      });
    }
    
    const result = await shiprocketService.generateLabel(shipment_id);
    
    res.json({
      success: true,
      data: result,
      message: 'Label generated successfully'
    });

  } catch (error) {
    console.error('Error generating label:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate label'
    });
  }
});

// Generate manifest endpoint
app.post('/api/shipping/generate-manifest', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }
    
    const { shipment_ids } = req.body;
    
    if (!shipment_ids || !Array.isArray(shipment_ids)) {
      return res.status(400).json({
        success: false,
        error: 'shipment_ids array is required'
      });
    }
    
    const result = await shiprocketService.generateManifest(shipment_ids);
    
    res.json({
      success: true,
      data: result,
      message: 'Manifest generated successfully'
    });

  } catch (error) {
    console.error('Error generating manifest:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate manifest'
    });
  }
});

// Account diagnostic endpoint
app.get('/api/shipping/diagnose', async (req, res) => {
  try {
    if (!shiprocketService) {
      return res.status(500).json({
        success: false,
        error: 'Shipping service not available'
      });
    }

    const diagnostics = {};
    
    try {
      await shiprocketService.ensureAuthenticated();
      diagnostics.authentication = 'SUCCESS';
    } catch (error) {
      diagnostics.authentication = `FAILED: ${error.message}`;
    }
    
    try {
      const pickupLocations = await shiprocketService.getPickupLocations();
      diagnostics.pickup_locations = pickupLocations;
      diagnostics.pickup_count = pickupLocations?.data?.shipping_address?.length || 0;
    } catch (error) {
      diagnostics.pickup_locations = `FAILED: ${error.message}`;
      diagnostics.pickup_count = 0;
    }
    
    try {
      const serviceability = await shiprocketService.checkServiceability('400001', '110001');
      diagnostics.serviceability_test = 'SUCCESS - Mumbai to Delhi test passed';
      diagnostics.available_couriers = serviceability?.data?.available_courier_companies?.length || 0;
    } catch (error) {
      diagnostics.serviceability_test = `FAILED: ${error.message}`;
      diagnostics.available_couriers = 0;
    }
    
    res.json({
      success: true,
      diagnostics,
      message: 'Account diagnostics completed'
    });

  } catch (error) {
    console.error('Diagnostic failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Diagnostic failed'
    });
  }
});

// Add shiprocket tracking Netlify function route
app.get('/.netlify/functions/shiprocket-track-order/:trackingId', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/shiprocket-track-order');
    
    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'GET',
      path: `/.netlify/functions/shiprocket-track-order/${req.params.trackingId}`
    };
    
    // Create mock context
    const context = {};
    
    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);
    
    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }
    
    // Send response
    res.status(result.statusCode || 200);
    
    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Error in shiprocket-track-order function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to track order: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Add DTDC tracking Netlify function route
app.post('/.netlify/functions/dtdc-track-order', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/dtdc-track-order');
    
    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'POST',
      path: '/.netlify/functions/dtdc-track-order',
      body: JSON.stringify(req.body)
    };
    
    // Create mock context
    const context = {};
    
    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);
    
    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }
    
    // Send response
    res.status(result.statusCode || 200);
    
    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Error in dtdc-track-order function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to track DTDC order: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Add debug Netlify function route
app.get('/.netlify/functions/debug-shiprocket', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/debug-shiprocket');
    
    // Create mock Netlify event object
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      httpMethod: 'GET',
      path: '/.netlify/functions/debug-shiprocket'
    };
    
    // Create mock context
    const context = {};
    
    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);
    
    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }
    
    // Send response
    res.status(result.statusCode || 200);
    
    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Error in debug-shiprocket function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to debug: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Add email service for order notifications
app.post('/.netlify/functions/send-order-email', async (req, res) => {
  try {
    // Import the Netlify function
    const netlifyFunction = require('./netlify/functions/send-order-email');
    
    // Create mock Netlify event object
    const event = {
      body: JSON.stringify(req.body),
      headers: req.headers,
      httpMethod: 'POST',
      path: '/.netlify/functions/send-order-email'
    };
    
    // Create mock context
    const context = {};
    
    // Call the Netlify function
    const result = await netlifyFunction.handler(event, context);
    
    // Set response headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }
    
    // Send response
    res.status(result.statusCode || 200);
    
    if (result.body) {
      try {
        const body = JSON.parse(result.body);
        res.json(body);
      } catch (e) {
        res.send(result.body);
      }
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Error in send-order-email function:', error);
    res.status(500).json({
      success: false,
      error: `Failed to send order email: ${error.message}`,
      message: 'Please check configuration and try again'
    });
  }
});

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nazakat website server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});