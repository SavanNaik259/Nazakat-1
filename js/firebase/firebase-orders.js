/**
 * Firebase Orders Module
 * 
 * This module handles order creation, storage and retrieval from Firebase.
 * Order data is stored at: users/{userId}/orders/{orderId}
 */

// Check if Firebase is initialized
if (typeof firebase === 'undefined') {
    console.error('Firebase is not initialized. Make sure to include Firebase SDK and initialize it first.');
}

/**
 * Check if authentication is required for placing orders
 * @returns {Object} Auth requirement status
 */
function checkOrderAuthRequirement() {
    // Default requirement: not authenticated and auth required
    const result = {
        requiresAuth: true,
        isAuthenticated: false
    };
    
    // Check if user is authenticated
    if (firebase.auth().currentUser) {
        result.isAuthenticated = true;
    }
    
    return result;
}

/**
 * Save order to Firebase
 * @param {Object} orderData - Order data to save
 * @returns {Promise<Object>} Success status and order ID
 */
async function saveOrderToFirebase(orderData) {
    try {
        // Check if user is authenticated
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('User not authenticated, cannot save order to Firebase');
            return {
                success: false,
                requiresAuth: true,
                error: 'Authentication required for order placement'
            };
        }
        
        console.log('User authenticated, proceeding with Firebase order save for user:', user.uid);
        
        // Validate orderData
        if (!orderData || !orderData.customer || !orderData.products) {
            console.error('Invalid order data structure');
            return {
                success: false,
                error: 'Invalid order data structure'
            };
        }
        
        // Create a clean copy of order data for Firebase
        const firebaseOrderData = {
            ...orderData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: user.uid,
            createdAt: new Date().toISOString()
        };
        
        // Create a new order document in the user's orders collection
        const userOrdersRef = firebase.firestore().collection('users').doc(user.uid).collection('orders');
        
        console.log('Attempting to save order to Firebase with data:', {
            orderReference: firebaseOrderData.orderReference,
            paymentMethod: firebaseOrderData.paymentMethod,
            paymentStatus: firebaseOrderData.paymentStatus,
            totalAmount: firebaseOrderData.totalAmount,
            itemCount: firebaseOrderData.products?.length || 0
        });
        
        // Add order to Firestore
        const orderRef = await userOrdersRef.add(firebaseOrderData);
        
        console.log('Successfully saved order to Firebase with ID:', orderRef.id);
        
        return {
            success: true,
            orderId: orderRef.id
        };
    } catch (error) {
        console.error('Error saving order to Firebase:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        return {
            success: false,
            error: error.message || 'Unknown error occurred while saving order'
        };
    }
}

/**
 * Update order payment status in Firebase
 * @param {String} orderId - ID of the order to update
 * @param {Object} paymentData - Payment data to update
 * @returns {Promise<Object>} Success status
 */
async function updateOrderPaymentStatus(orderId, paymentData) {
    try {
        // Check if user is authenticated
        const user = firebase.auth().currentUser;
        if (!user) {
            return {
                success: false,
                error: 'Authentication required to update order'
            };
        }
        
        // Get reference to the order document
        const orderRef = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('orders')
            .doc(orderId);
        
        // Update the order with payment information
        await orderRef.update({
            paymentStatus: paymentData.paymentStatus,
            paymentId: paymentData.paymentId,
            paymentSignature: paymentData.paymentSignature,
            paymentUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return {
            success: true
        };
    } catch (error) {
        console.error('Error updating order payment status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get user's orders from Firebase
 * @returns {Promise<Object>} Success status and orders
 */
async function getUserOrders() {
    try {
        // Check if user is authenticated
        const user = firebase.auth().currentUser;
        if (!user) {
            return {
                success: false,
                error: 'Authentication required to view orders'
            };
        }
        
        // Get user's orders collection
        const userOrdersRef = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('orders');
        
        // Query orders, sorted by timestamp in descending order
        const orderSnapshot = await userOrdersRef
            .orderBy('timestamp', 'desc')
            .get();
        
        // Map snapshot to array of order objects
        const orders = orderSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert timestamps to date strings for easier display
                orderDate: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
            };
        });
        
        return {
            success: true,
            orders
        };
    } catch (error) {
        console.error('Error getting user orders:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Create global object to expose functions
window.firebaseOrdersModule = {
    checkOrderAuthRequirement,
    saveOrderToFirebase,
    updateOrderPaymentStatus,
    getUserOrders
};

// Log that the module is loaded
console.log('Firebase Orders module loaded');