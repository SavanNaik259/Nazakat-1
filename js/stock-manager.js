/**
 * Stock Management System
 * Handles stock updates, validation, and notifications for Auric Jewelry
 */

window.StockManager = (function() {
    'use strict';

    // Stock threshold for low stock alerts
    const LOW_STOCK_THRESHOLD = 5;
    const OUT_OF_STOCK_THRESHOLD = 0;

    /**
     * Update product stock after successful order placement
     * @param {Array} orderItems - Array of order items with id and quantity
     * @returns {Promise<Object>} Result object with success status
     */
    async function updateStockAfterOrder(orderItems) {
        try {
            console.log('Updating stock for order items:', orderItems);
            
            const stockUpdates = [];
            const outOfStockProducts = [];
            const lowStockProducts = [];

            // Process each order item
            for (const item of orderItems) {
                try {
                    const result = await updateProductStock(item.id, item.quantity);
                    if (result.success) {
                        stockUpdates.push({
                            productId: item.id,
                            productName: item.name,
                            previousStock: result.previousStock,
                            newStock: result.newStock,
                            quantity: item.quantity
                        });

                        // Check for stock alerts
                        if (result.newStock <= OUT_OF_STOCK_THRESHOLD) {
                            outOfStockProducts.push({
                                id: item.id,
                                name: item.name,
                                stock: result.newStock
                            });
                        } else if (result.newStock <= LOW_STOCK_THRESHOLD) {
                            lowStockProducts.push({
                                id: item.id,
                                name: item.name,
                                stock: result.newStock
                            });
                        }
                    } else {
                        console.error(`Failed to update stock for product ${item.id}:`, result.error);
                    }
                } catch (error) {
                    console.error(`Error updating stock for product ${item.id}:`, error);
                }
            }

            // Send notifications for stock alerts
            if (outOfStockProducts.length > 0) {
                await sendStockAlertNotification('out_of_stock', outOfStockProducts);
            }
            if (lowStockProducts.length > 0) {
                await sendStockAlertNotification('low_stock', lowStockProducts);
            }

            console.log('Stock updates completed:', stockUpdates);
            return {
                success: true,
                updates: stockUpdates,
                outOfStockProducts,
                lowStockProducts
            };

        } catch (error) {
            console.error('Error in updateStockAfterOrder:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update stock for a single product
     * @param {string} productId - Product ID
     * @param {number} quantity - Quantity to subtract from stock
     * @returns {Promise<Object>} Result with success status and stock info
     */
    async function updateProductStock(productId, quantity) {
        try {
            // Determine category from product ID prefix
            const category = getProductCategory(productId);
            console.log(`Updating stock for product ${productId} in category ${category}`);

            // Load current products from Firebase
            const response = await fetch(`/.netlify/functions/load-products?category=${category}&cacheBust=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load products: ${response.status}`);
            }

            const data = await response.json();
            const products = data.products || [];

            // Find the product to update
            const productIndex = products.findIndex(p => p.id === productId);
            if (productIndex === -1) {
                throw new Error(`Product ${productId} not found in category ${category}`);
            }

            const product = products[productIndex];
            const previousStock = product.stock || 0;
            const newStock = Math.max(0, previousStock - quantity);

            console.log(`Product ${productId}: ${previousStock} -> ${newStock} (reduced by ${quantity})`);

            // Update product stock
            products[productIndex].stock = newStock;
            products[productIndex].updatedAt = new Date().toISOString();

            // Save updated products back to Firebase
            const updateResponse = await fetch('/.netlify/functions/update-product-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category,
                    products,
                    productId,
                    previousStock,
                    newStock,
                    quantityReduced: quantity
                })
            });

            if (!updateResponse.ok) {
                throw new Error(`Failed to update product stock: ${updateResponse.status}`);
            }

            const updateResult = await updateResponse.json();
            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Unknown error updating stock');
            }

            return {
                success: true,
                previousStock,
                newStock,
                quantityReduced: quantity
            };

        } catch (error) {
            console.error(`Error updating stock for product ${productId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get product category from product ID prefix
     * @param {string} productId - Product ID
     * @returns {string} Category name
     */
    function getProductCategory(productId) {
        if (productId.startsWith('FEA-')) return 'featured-collection';
        if (productId.startsWith('NEW-')) return 'new-arrivals';
        if (productId.startsWith('SAR-')) return 'saree-collection';
        
        // Fallback - try to determine from other patterns
        console.warn(`Unknown product ID pattern: ${productId}, defaulting to new-arrivals`);
        return 'new-arrivals';
    }

    /**
     * Send stock alert notification to admin dashboard
     * @param {string} type - Type of alert ('out_of_stock' or 'low_stock')
     * @param {Array} products - Array of affected products
     */
    async function sendStockAlertNotification(type, products) {
        try {
            console.log(`Sending ${type} notification for products:`, products);

            const notification = {
                id: `stock-alert-${Date.now()}`,
                type: type,
                title: type === 'out_of_stock' ? 'Products Out of Stock' : 'Low Stock Alert',
                message: `${products.length} product(s) require attention`,
                products: products,
                timestamp: new Date().toISOString(),
                read: false,
                priority: type === 'out_of_stock' ? 'high' : 'medium'
            };

            // Send notification to admin dashboard
            const response = await fetch('/.netlify/functions/admin-notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'add',
                    notification: notification
                })
            });

            if (response.ok) {
                console.log(`${type} notification sent successfully`);
            } else {
                console.error(`Failed to send ${type} notification:`, response.status);
            }

        } catch (error) {
            console.error(`Error sending ${type} notification:`, error);
        }
    }

    /**
     * Check if product is available for purchase
     * @param {string} productId - Product ID
     * @param {number} requestedQuantity - Requested quantity
     * @returns {Promise<Object>} Availability status
     */
    async function checkProductAvailability(productId, requestedQuantity) {
        try {
            const category = getProductCategory(productId);
            const response = await fetch(`/.netlify/functions/load-products?category=${category}&cacheBust=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load products: ${response.status}`);
            }

            const data = await response.json();
            const products = data.products || [];
            const product = products.find(p => p.id === productId);

            if (!product) {
                return {
                    available: false,
                    error: 'Product not found',
                    stock: 0
                };
            }

            const currentStock = product.stock || 0;
            const available = currentStock >= requestedQuantity;

            return {
                available,
                stock: currentStock,
                requestedQuantity,
                productName: product.name
            };

        } catch (error) {
            console.error(`Error checking availability for product ${productId}:`, error);
            return {
                available: false,
                error: error.message,
                stock: 0
            };
        }
    }

    /**
     * Get out of stock products for admin dashboard
     * @returns {Promise<Array>} Array of out of stock products
     */
    async function getOutOfStockProducts() {
        try {
            const categories = ['featured-collection', 'new-arrivals', 'saree-collection'];
            const outOfStockProducts = [];

            for (const category of categories) {
                const response = await fetch(`/.netlify/functions/load-products?category=${category}&cacheBust=${Date.now()}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const products = data.products || [];
                    
                    const categoryOutOfStock = products.filter(product => {
                        const stock = product.stock || 0;
                        return stock <= OUT_OF_STOCK_THRESHOLD;
                    }).map(product => ({
                        ...product,
                        category,
                        stock: product.stock || 0
                    }));

                    outOfStockProducts.push(...categoryOutOfStock);
                }
            }

            console.log('Out of stock products found:', outOfStockProducts.length);
            return outOfStockProducts;

        } catch (error) {
            console.error('Error getting out of stock products:', error);
            return [];
        }
    }

    /**
     * Get low stock products for admin dashboard
     * @returns {Promise<Array>} Array of low stock products
     */
    async function getLowStockProducts() {
        try {
            const categories = ['featured-collection', 'new-arrivals', 'saree-collection'];
            const lowStockProducts = [];

            for (const category of categories) {
                const response = await fetch(`/.netlify/functions/load-products?category=${category}&cacheBust=${Date.now()}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const products = data.products || [];
                    
                    const categoryLowStock = products.filter(product => {
                        const stock = product.stock || 0;
                        return stock > OUT_OF_STOCK_THRESHOLD && stock <= LOW_STOCK_THRESHOLD;
                    }).map(product => ({
                        ...product,
                        category,
                        stock: product.stock || 0
                    }));

                    lowStockProducts.push(...categoryLowStock);
                }
            }

            console.log('Low stock products found:', lowStockProducts.length);
            return lowStockProducts;

        } catch (error) {
            console.error('Error getting low stock products:', error);
            return [];
        }
    }

    // Public API
    return {
        updateStockAfterOrder,
        updateProductStock,
        checkProductAvailability,
        getOutOfStockProducts,
        getLowStockProducts,
        sendStockAlertNotification
    };

})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Stock Manager initialized');
});