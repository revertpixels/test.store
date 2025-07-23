// =======================================================
// 1. GLOBAL VARIABLES AND INITIAL SETUP
// =======================================================
let products = [];
let nextProductId = 1;
let cart = [];
let cashCounter = 0;
let salesHistory = [];
let notifications = [];
let currentUser = { name: 'Shopkeeper', type: 'shopkeeper' };
let isOwnerLoggedIn = false;
let shopSettings = {
    shopName: 'Stationery Shop & Cyber Cafe',
    openTime: '09:00',
    closeTime: '21:00',
    lowStockThreshold: 10,
    currencySymbol: 'Rs.',
    autoPrintReceipts: false,
    soundNotifications: true,
    autoBackup: false
};
let returnedItems = [];
let currentPaymentAmount = 0;
let currentPaymentMode = '';

// Owner and Shopkeeper passwords
const OWNER_PASSWORD = "owner2024";
const SHOPKEEPER_PASSWORD = "shop2024";

// Initialize jsPDF
const { jsPDF } = window.jspdf;

// =======================================================
// 2. UTILITY FUNCTIONS
// =======================================================
function generateProductId() {
    const id = `prod_${String(nextProductId).padStart(3, '0')}`;
    nextProductId++;
    return id;
}

function createMessageBox() {
    const div = document.createElement('div');
    div.id = 'message-box';
    div.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        display: none;
        opacity: 0;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-weight: 500;
    `;
    return div;
}

function showMessage(message, type = 'info') {
    const messageBox = document.getElementById('message-box') || createMessageBox();
    if (!document.getElementById('message-box')) {
        document.body.appendChild(messageBox);
    }

    messageBox.textContent = message;
    let bgColor = '#333';
    if (type === 'success') bgColor = '#4CAF50';
    else if (type === 'error') bgColor = '#f44336';
    else if (type === 'info') bgColor = '#2196F3';
    else if (type === 'warning') bgColor = '#ff9800';

    messageBox.style.backgroundColor = bgColor;
    messageBox.style.display = 'block';
    messageBox.offsetWidth;
    messageBox.style.opacity = '1';

    setTimeout(() => {
        messageBox.style.opacity = '0';
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 300);
    }, 3000);
}

// =======================================================
// 3. DATE & TIME FUNCTIONS
// =======================================================
function updateDateTime() {
    const now = new Date();

    // Update date
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    const dateText = document.getElementById('date-text');
    if (dateText) {
        dateText.textContent = now.toLocaleDateString('en-US', dateOptions);
    }

    // Update time
    const timeText = document.getElementById('time-text');
    if (timeText) {
        timeText.textContent = now.toLocaleTimeString('en-US', { hour12: true });
    }

    // Update shop status
    updateShopStatus(now);
}

function updateShopStatus(now) {
    const shopStatusIcon = document.getElementById('shop-status');
    const statusText = document.getElementById('status-text');

    if (!shopStatusIcon || !statusText) return;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = shopSettings.openTime.split(':').map(Number);
    const [closeHour, closeMin] = shopSettings.closeTime.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    if (currentTime >= openTime && currentTime <= closeTime) {
        shopStatusIcon.style.color = '#2ecc71';
        statusText.textContent = 'OPEN';
    } else {
        shopStatusIcon.style.color = '#e74c3c';
        statusText.textContent = 'CLOSED';
    }
}

// =======================================================
// 4. NOTIFICATION SYSTEM
// =======================================================
function addNotification(message, type = 'info') {
    const notification = {
        id: Date.now(),
        message: message,
        type: type,
        timestamp: new Date(),
        read: false
    };

    notifications.unshift(notification);
    updateNotificationDisplay();
    saveNotifications();
}

function updateNotificationDisplay() {
    const notificationCount = document.getElementById('notification-count');
    const notificationList = document.getElementById('notification-list');

    if (!notificationCount || !notificationList) return;

    const unreadCount = notifications.filter(n => !n.read).length;
    notificationCount.textContent = unreadCount;
    notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';

    // Update notification list
    notificationList.innerHTML = '';
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="empty-state">No notifications</div>';
    } else {
        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
            item.innerHTML = `
                <div class="notification-content">
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${notification.timestamp.toLocaleString()}</div>
                </div>
            `;
            item.addEventListener('click', () => markNotificationAsRead(notification.id));
            notificationList.appendChild(item);
        });
    }
}

function markNotificationAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        updateNotificationDisplay();
        saveNotifications();
    }
}

function clearAllNotifications() {
    notifications = [];
    updateNotificationDisplay();
    saveNotifications();
}

// =======================================================
// 5. DATA PERSISTENCE
// =======================================================
function saveDataToStorage() {
    try {
        localStorage.setItem('stationeryShop_products', JSON.stringify(products));
        localStorage.setItem('stationeryShop_salesHistory', JSON.stringify(salesHistory));
        localStorage.setItem('stationeryShop_cashCounter', JSON.stringify(cashCounter));
        localStorage.setItem('stationeryShop_returnedItems', JSON.stringify(returnedItems));
        localStorage.setItem('stationeryShop_nextProductId', JSON.stringify(nextProductId));
        localStorage.setItem('stationeryShop_shopSettings', JSON.stringify(shopSettings));
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
        showMessage('Error saving data!', 'error');
    }
}

function loadDataFromStorage() {
    try {
        const savedProducts = localStorage.getItem('stationeryShop_products');
        const savedSalesHistory = localStorage.getItem('stationeryShop_salesHistory');
        const savedCashCounter = localStorage.getItem('stationeryShop_cashCounter');
        const savedReturnedItems = localStorage.getItem('stationeryShop_returnedItems');
        const savedNextProductId = localStorage.getItem('stationeryShop_nextProductId');
        const savedShopSettings = localStorage.getItem('stationeryShop_shopSettings');

        if (savedProducts) {
            products = JSON.parse(savedProducts);
        }
        if (savedSalesHistory) {
            salesHistory = JSON.parse(savedSalesHistory);
        }
        if (savedCashCounter) {
            cashCounter = parseFloat(savedCashCounter);
        }
        if (savedReturnedItems) {
            returnedItems = JSON.parse(savedReturnedItems);
        }
        if (savedNextProductId) {
            nextProductId = parseInt(savedNextProductId);
        }
        if (savedShopSettings) {
            shopSettings = { ...shopSettings, ...JSON.parse(savedShopSettings) };
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
        showMessage('Error loading saved data!', 'error');
    }
}

function saveNotifications() {
    try {
        localStorage.setItem('stationeryShop_notifications', JSON.stringify(notifications));
    } catch (error) {
        console.error('Error saving notifications:', error);
    }
}

function loadNotifications() {
    try {
        const savedNotifications = localStorage.getItem('stationeryShop_notifications');
        if (savedNotifications) {
            notifications = JSON.parse(savedNotifications);
            notifications.forEach(n => {
                n.timestamp = new Date(n.timestamp);
            });
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// =======================================================
// 6. PRODUCT MANAGEMENT
// =======================================================
function addProduct(name, singleBarcode, singlePrice, bulkBarcode, bulkPrice, bulkQuantity, initialStock, initialBoxes) {
    // Check if barcodes already exist
    const existingProduct = products.find(p =>
        p.singleBarcode === singleBarcode ||
        p.bulkBarcode === bulkBarcode ||
        (p.singleBarcode === bulkBarcode) ||
        (p.bulkBarcode === singleBarcode)
    );

    if (existingProduct) {
        showMessage('Error: Barcode already exists!', 'error');
        return;
    }

    const product = {
        id: generateProductId(),
        name: name,
        singleBarcode: singleBarcode,
        singlePrice: parseFloat(singlePrice),
        bulkBarcode: bulkBarcode,
        bulkPrice: parseFloat(bulkPrice),
        bulkQuantity: parseInt(bulkQuantity),
        currentStock: parseInt(initialStock) + (parseInt(initialBoxes) * parseInt(bulkQuantity)),
        dateAdded: new Date(),
        lastUpdated: new Date()
    };

    products.push(product);
    saveDataToStorage();
    displayProducts();
    displayInventory();
    updateStockProductDropdown();
    updateStatistics();

    // Add notification
    addNotification(`New product added: ${name}`, 'success');

    // Clear form
    const form = document.getElementById('add-product-form');
    if (form) form.reset();

    showMessage('Product added successfully!', 'success');
}

function deleteProduct(productId) {
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex > -1) {
        const productName = products[productIndex].name;
        products.splice(productIndex, 1);
        saveDataToStorage();
        displayProducts();
        displayInventory();
        updateStockProductDropdown();
        updateStatistics();

        // Add notification
        addNotification(`Product deleted: ${productName}`, 'warning');

        showMessage('Product deleted successfully!', 'success');
    }
}

function editProduct(productId, newName, newSinglePrice, newBulkPrice) {
    const product = products.find(p => p.id === productId);
    if (product) {
        product.name = newName;
        product.singlePrice = parseFloat(newSinglePrice);
        product.bulkPrice = parseFloat(newBulkPrice);
        product.lastUpdated = new Date();

        saveDataToStorage();
        displayProducts();
        displayInventory();
        updateStockProductDropdown();

        // Add notification
        addNotification(`Product updated: ${newName}`, 'info');

        showMessage('Product updated successfully!', 'success');
    }
}

function addStock(productId, singleUnits, bulkBoxes) {
    const product = products.find(p => p.id === productId);
    if (product) {
        const additionalUnits = parseInt(singleUnits) + (parseInt(bulkBoxes) * product.bulkQuantity);
        product.currentStock += additionalUnits;
        product.lastUpdated = new Date();

        saveDataToStorage();
        displayProducts();
        displayInventory();
        updateStatistics();

        // Show update info
        const stockUpdateInfo = document.getElementById('stock-update-info');
        if (stockUpdateInfo) {
            stockUpdateInfo.innerHTML = `
                <div class="stock-update-success">
                    <strong>Stock Updated!</strong><br>
                    Product: ${product.name}<br>
                    Added: ${additionalUnits} units<br>
                    New Stock: ${product.currentStock} units
                </div>
            `;
        }

        // Add notification
        addNotification(`Stock updated: ${product.name} (+${additionalUnits} units)`, 'info');

        // Clear form
        const form = document.getElementById('add-stock-form');
        if (form) form.reset();

        showMessage('Stock updated successfully!', 'success');
    }
}

function findProductByBarcode(barcode) {
    return products.find(p => p.singleBarcode === barcode || p.bulkBarcode === barcode);
}

function calculateStockDisplay(product) {
    const fullBoxes = Math.floor(product.currentStock / product.bulkQuantity);
    const remainingUnits = product.currentStock % product.bulkQuantity;

    if (fullBoxes > 0 && remainingUnits > 0) {
        return `${fullBoxes} boxes + ${remainingUnits} units`;
    } else if (fullBoxes > 0) {
        return `${fullBoxes} boxes`;
    } else {
        return `${remainingUnits} units`;
    }
}

// =======================================================
// 7. POINT OF SALE (POS) SYSTEM
// =======================================================
function addToCart(barcode, quantity) {
    const product = findProductByBarcode(barcode);
    if (!product) {
        showMessage('Product not found!', 'error');
        return;
    }

    const requestedQuantity = parseInt(quantity);

    // Check if it's single or bulk barcode
    const isBulk = product.bulkBarcode === barcode;
    const unitsNeeded = isBulk ? requestedQuantity * product.bulkQuantity : requestedQuantity;

    if (product.currentStock < unitsNeeded) {
        showMessage('Insufficient stock!', 'error');
        return;
    }

    // Check if product is already in cart
    const existingCartItem = cart.find(item =>
        item.productId === product.id &&
        item.type === (isBulk ? 'bulk' : 'single')
    );

    if (existingCartItem) {
        existingCartItem.quantity += requestedQuantity;
    } else {
        const cartItem = {
            productId: product.id,
            name: product.name,
            type: isBulk ? 'bulk' : 'single',
            quantity: requestedQuantity,
            singlePrice: product.singlePrice,
            bulkPrice: product.bulkPrice,
            bulkQuantity: product.bulkQuantity,
            barcode: barcode
        };
        cart.push(cartItem);
    }

    updateCartDisplay();
    showMessage(`Added ${requestedQuantity} ${isBulk ? 'bulk pack(s)' : 'unit(s)'} to cart`, 'success');

    // Clear inputs
    const barcodeInput = document.getElementById('barcode-input');
    const quantityInput = document.getElementById('pos-quantity-input');
    if (barcodeInput) barcodeInput.value = '';
    if (quantityInput) quantityInput.value = '1';
    if (barcodeInput) barcodeInput.focus();
}

function removeItemFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
    showMessage('Item removed from cart', 'info');
}

function clearCart() {
    cart = [];
    updateCartDisplay();
    showMessage('Cart cleared', 'info');
}

function checkout() {
    if (cart.length === 0) {
        showMessage('Cart is empty!', 'error');
        return;
    }

    // Calculate total
    let total = 0;
    cart.forEach(item => {
        if (item.type === 'single') {
            total += item.singlePrice * item.quantity;
        } else if (item.type === 'bulk') {
            total += item.bulkPrice * item.quantity;
        }
    });

    // Show payment mode selection
    currentPaymentAmount = total;
    const paymentAmount = document.getElementById('payment-amount');
    const paymentModal = document.getElementById('payment-mode-modal');

    if (paymentAmount) paymentAmount.textContent = total.toFixed(2);
    if (paymentModal) paymentModal.style.display = 'block';
}

function processPayment(paymentMode) {
    // Hide payment mode modal
    const paymentModal = document.getElementById('payment-mode-modal');
    if (paymentModal) paymentModal.style.display = 'none';

    // Show payment confirmation modal
    currentPaymentMode = paymentMode;
    const confirmAmount = document.getElementById('confirm-amount');
    const confirmPaymentMode = document.getElementById('confirm-payment-mode');
    const confirmationModal = document.getElementById('payment-confirmation-modal');

    if (confirmAmount) confirmAmount.textContent = currentPaymentAmount.toFixed(2);
    if (confirmPaymentMode) confirmPaymentMode.textContent = paymentMode.toUpperCase();
    if (confirmationModal) confirmationModal.style.display = 'block';
}

function confirmPayment() {
    // Hide confirmation modal
    const confirmationModal = document.getElementById('payment-confirmation-modal');
    if (confirmationModal) confirmationModal.style.display = 'none';

    // Update stock
    cart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            const unitsToDeduct = item.type === 'bulk' ?
                item.quantity * item.bulkQuantity :
                item.quantity;
            product.currentStock -= unitsToDeduct;
        }
    });

    // Add to sales history
    const sale = {
        id: Date.now(),
        items: [...cart],
        total: currentPaymentAmount,
        paymentMode: currentPaymentMode,
        timestamp: new Date(),
        cashier: currentUser.name,
        isReturn: false,
        isReplacement: false
    };

    salesHistory.push(sale);

    // Update cash counter
    cashCounter += currentPaymentAmount;

    // Save data
    saveDataToStorage();

    // Update displays
    updateCartDisplay();
    updateCashDisplay();
    displayInventory();
    updateStatistics();

    // Add notification
    addNotification(`Sale completed: ${shopSettings.currencySymbol} ${currentPaymentAmount.toFixed(2)} (${currentPaymentMode.toUpperCase()})`, 'success');

    // Generate and show receipt
    generateReceipt(sale);

    // Clear cart
    clearCart();

    showMessage(`Payment received! Total: ${shopSettings.currencySymbol} ${currentPaymentAmount.toFixed(2)}`, 'success');

    // Reset payment variables
    currentPaymentAmount = 0;
    currentPaymentMode = '';
}

function cancelPayment() {
    // Hide all payment modals
    const paymentModal = document.getElementById('payment-mode-modal');
    const confirmationModal = document.getElementById('payment-confirmation-modal');

    if (paymentModal) paymentModal.style.display = 'none';
    if (confirmationModal) confirmationModal.style.display = 'none';

    // Reset payment variables
    currentPaymentAmount = 0;
    currentPaymentMode = '';

    showMessage('Payment cancelled', 'info');
}

function generateReceipt(sale) {
    const receiptWindow = window.open('', '_blank', 'width=350,height=600');

    if (!receiptWindow) {
        showMessage('Please allow popups to generate receipt', 'warning');
        return;
    }

    let receiptContent = `
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { 
                    font-family: 'Courier New', monospace; 
                    font-size: 12px; 
                    margin: 10px; 
                    line-height: 1.3;
                }
                .header { 
                    text-align: center; 
                    border-bottom: 2px solid #000; 
                    padding-bottom: 10px; 
                    margin-bottom: 15px;
                }
                .item { 
                    margin: 8px 0; 
                    display: flex; 
                    justify-content: space-between;
                }
                .total { 
                    border-top: 2px solid #000; 
                    padding-top: 10px; 
                    font-weight: bold; 
                    margin-top: 15px;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    border-top: 1px solid #000;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h3>${shopSettings.shopName}</h3>
                <p>Receipt #${sale.id}</p>
                <p>${new Date(sale.timestamp).toLocaleString()}</p>
            </div>
            <div class="items">
    `;

    sale.items.forEach(item => {
        const itemTotal = item.type === 'single' ?
            item.singlePrice * item.quantity :
            item.bulkPrice * item.quantity;

        receiptContent += `
            <div class="item">
                <span>${item.name} (${item.type === 'single' ? 'Single' : 'Bulk'}) x ${item.quantity}</span>
                <span>${shopSettings.currencySymbol} ${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });

    receiptContent += `
            </div>
            <div class="total">
                <div class="item">
                    <span>Payment Mode:</span>
                    <span>${sale.paymentMode.toUpperCase()}</span>
                </div>
                <div class="item">
                    <span>Total:</span>
                    <span>${shopSettings.currencySymbol} ${sale.total.toFixed(2)}</span>
                </div>
            </div>
            <div class="footer">
                <p>Cashier: ${sale.cashier}</p>
                <p>Thank You for Shopping!</p>
            </div>
        </body>
        </html>
    `;

    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();

    // Auto-print if enabled
    if (shopSettings.autoPrintReceipts) {
        setTimeout(() => {
            receiptWindow.print();
        }, 1000);
    }
}

// =======================================================
// 8. INVENTORY MANAGEMENT
// =======================================================
function updateStatistics() {
    // Update today's sales
    const today = new Date().toDateString();
    const todaySales = salesHistory.filter(sale =>
        new Date(sale.timestamp).toDateString() === today &&
        !sale.isReturn &&
        !sale.isReplacement
    );
    const todayReturns = salesHistory.filter(sale =>
        new Date(sale.timestamp).toDateString() === today &&
        sale.isReturn
    );

    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0) -
        Math.abs(todayReturns.reduce((sum, sale) => sum + sale.total, 0));

    const todaySalesSpan = document.getElementById('today-sales');
    const todayTransactionsSpan = document.getElementById('today-transactions');
    const lowStockCountSpan = document.getElementById('low-stock-count');
    const totalProductsSpan = document.getElementById('total-products');

    if (todaySalesSpan) todaySalesSpan.textContent = todayTotal.toFixed(2);
    if (todayTransactionsSpan) todayTransactionsSpan.textContent = todaySales.length;

    // Update low stock count
    const lowStockCount = products.filter(p =>
        p.currentStock > 0 &&
        p.currentStock < shopSettings.lowStockThreshold
    ).length;
    if (lowStockCountSpan) lowStockCountSpan.textContent = lowStockCount;

    // Update total products
    if (totalProductsSpan) totalProductsSpan.textContent = products.length;

    // Add notifications for low stock
    const outOfStockProducts = products.filter(p => p.currentStock === 0);
    const lowStockProducts = products.filter(p =>
        p.currentStock > 0 &&
        p.currentStock < shopSettings.lowStockThreshold
    );

    // Check for new out of stock items
    outOfStockProducts.forEach(product => {
        const existingNotification = notifications.find(n =>
            n.message.includes(product.name) &&
            n.message.includes('out of stock')
        );
        if (!existingNotification) {
            addNotification(`${product.name} is out of stock!`, 'error');
        }
    });

    // Check for new low stock items
    lowStockProducts.forEach(product => {
        const existingNotification = notifications.find(n =>
            n.message.includes(product.name) &&
            n.message.includes('low stock')
        );
        if (!existingNotification) {
            addNotification(`${product.name} is running low on stock (${product.currentStock} units)`, 'warning');
        }
    });
}

function updateStockProductDropdown() {
    const stockProductSelect = document.getElementById('stock-product-select');
    if (!stockProductSelect) return;

    stockProductSelect.innerHTML = '<option value="">Select a product...</option>';

    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (Current: ${product.currentStock} units)`;
        stockProductSelect.appendChild(option);
    });
}

function displayProducts() {
    const productListDiv = document.getElementById('product-list');
    if (!productListDiv) return;

    productListDiv.innerHTML = '';

    if (products.length === 0) {
        productListDiv.innerHTML = '<p>No products added yet. Use the form above to add your first product.</p>';
        return;
    }

    // Show only recent products (last 5)
    const recentProducts = products.slice(-5).reverse();

    const ul = document.createElement('ul');
    recentProducts.forEach(product => {
        const stockInfo = calculateStockDisplay(product);
        const li = document.createElement('li');
        const stockClass = product.currentStock === 0 ? 'out-of-stock' :
            product.currentStock < shopSettings.lowStockThreshold ? 'low-stock' : '';

        li.innerHTML = `
            <div class="product-details">
                <strong>${product.name}</strong> <span class="product-id">${product.id}</span>
                <br>Single: <code>${product.singleBarcode}</code> (${shopSettings.currencySymbol} ${product.singlePrice.toFixed(2)})
                <br>Bulk: <code>${product.bulkBarcode}</code> (${shopSettings.currencySymbol} ${product.bulkPrice.toFixed(2)})
                <br>Stock: <span class="stock-display ${stockClass}">${stockInfo}</span>
            </div>
            <div class="product-actions">
                <button class="edit-product-btn" data-id="${product.id}">Edit</button>
                <button class="delete-product-btn" data-id="${product.id}">Delete</button>
            </div>
        `;
        ul.appendChild(li);
    });

    productListDiv.appendChild(ul);

    // Add "See All Products" button if there are more than 5 products
    if (products.length > 5) {
        const seeAllBtn = document.createElement('button');
        seeAllBtn.textContent = `See All Products (${products.length})`;
        seeAllBtn.className = 'see-all-btn';
        seeAllBtn.addEventListener('click', showAllProducts);
        productListDiv.appendChild(seeAllBtn);
    }

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            editProductPrompt(productId);
        });
    });

    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this product?')) {
                deleteProduct(productId);
            }
        });
    });
}

function showAllProducts() {
    const allProductsList = document.getElementById('all-products-list');
    const allProductsModal = document.getElementById('all-products-modal');

    if (!allProductsList || !allProductsModal) return;

    allProductsList.innerHTML = '';

    if (products.length === 0) {
        allProductsList.innerHTML = '<p>No products to display.</p>';
        allProductsModal.style.display = 'block';
        return;
    }

    // Add search functionality in modal
    const searchInput = document.getElementById('modal-search');
    const sortSelect = document.getElementById('modal-sort');

    let displayProducts = [...products];

    // Apply search if there's a search term
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        displayProducts = displayProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.singleBarcode.includes(searchTerm) ||
            (product.bulkBarcode && product.bulkBarcode.includes(searchTerm))
        );
    }

    // Apply sorting
    if (sortSelect && sortSelect.value) {
        switch(sortSelect.value) {
            case 'name':
                displayProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'stock':
                displayProducts.sort((a, b) => a.currentStock - b.currentStock);
                break;
            case 'recent':
                displayProducts.reverse();
                break;
        }
    }

    const ul = document.createElement('ul');
    displayProducts.forEach(product => {
        const stockInfo = calculateStockDisplay(product);
        const li = document.createElement('li');
        const stockClass = product.currentStock === 0 ? 'out-of-stock' :
            product.currentStock < shopSettings.lowStockThreshold ? 'low-stock' : '';

        li.innerHTML = `
            <div class="product-details">
                <strong>${product.name}</strong> <span class="product-id">${product.id}</span>
                <br>Single: <code>${product.singleBarcode}</code> (${shopSettings.currencySymbol} ${product.singlePrice.toFixed(2)})
                <br>Bulk: <code>${product.bulkBarcode}</code> (${shopSettings.currencySymbol} ${product.bulkPrice.toFixed(2)})
                <br>Stock: <span class="stock-display ${stockClass}">${stockInfo}</span>
            </div>
            <div class="product-actions">
                <button class="edit-product-btn-modal" data-id="${product.id}">Edit</button>
                <button class="delete-product-btn-modal" data-id="${product.id}">Delete</button>
            </div>
        `;
        ul.appendChild(li);
    });

    allProductsList.appendChild(ul);
    allProductsModal.style.display = 'block';

    // Add event listeners for modal buttons
    document.querySelectorAll('.edit-product-btn-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            editProductPrompt(productId);
        });
    });

    document.querySelectorAll('.delete-product-btn-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this product?')) {
                deleteProduct(productId);
                showAllProducts(); // Refresh the modal
            }
        });
    });
}

function editProductPrompt(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newName = prompt('Enter new product name:', product.name);
    if (newName === null) return;

    const newSinglePrice = prompt('Enter new single price:', product.singlePrice);
    if (newSinglePrice === null) return;

    const newBulkPrice = prompt('Enter new bulk price:', product.bulkPrice);
    if (newBulkPrice === null) return;

    if (newName && newSinglePrice && newBulkPrice) {
        editProduct(productId, newName, newSinglePrice, newBulkPrice);
    }
}

// FIXED: Enhanced inventory display with stock status indicators
function displayInventory() {
    const inventoryListDiv = document.getElementById('inventory-list');
    if (!inventoryListDiv) return;

    inventoryListDiv.innerHTML = '';

    if (products.length === 0) {
        inventoryListDiv.innerHTML = '<p>No inventory to display. Add products first.</p>';
        return;
    }

    // Add low stock alert at top
    const lowStockProducts = products.filter(p => p.currentStock > 0 && p.currentStock < shopSettings.lowStockThreshold);
    const outOfStockProducts = products.filter(p => p.currentStock === 0);

    if (outOfStockProducts.length > 0 || lowStockProducts.length > 0) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'stock-alert';
        alertDiv.innerHTML = `
            ${outOfStockProducts.length > 0 ?
            `<div class="alert-danger">⚠️ ${outOfStockProducts.length} product(s) out of stock</div>` :
            ''}
            ${lowStockProducts.length > 0 ?
            `<div class="alert-warning">⚠️ ${lowStockProducts.length} product(s) running low on stock</div>` :
            ''}
        `;
        inventoryListDiv.appendChild(alertDiv);
    }

    const ul = document.createElement('ul');
    products.forEach(product => {
        const stockInfo = calculateStockDisplay(product);
        const li = document.createElement('li');

        // FIXED: Add stock status classes and indicators
        let stockStatus = 'good-stock';
        let stockStatusText = 'Good Stock';

        if (product.currentStock === 0) {
            stockStatus = 'out-of-stock';
            stockStatusText = 'Out of Stock';
        } else if (product.currentStock < shopSettings.lowStockThreshold) {
            stockStatus = 'low-stock';
            stockStatusText = 'Low Stock';
        }

        li.className = stockStatus;

        li.innerHTML = `
            <strong>${product.name}</strong> - 
            <span class="stock-display ${stockStatus}">${stockInfo}</span>
            <span class="stock-status-indicator ${stockStatus}">${stockStatusText}</span>
            <div class="stock-info">
                Single: <code>${product.singleBarcode}</code> (${shopSettings.currencySymbol} ${product.singlePrice.toFixed(2)}) | 
                Bulk: <code>${product.bulkBarcode}</code> (${shopSettings.currencySymbol} ${product.bulkPrice.toFixed(2)}) - ${product.bulkQuantity} units per pack
            </div>
        `;
        ul.appendChild(li);
    });

    inventoryListDiv.appendChild(ul);
}

function updateCartDisplay() {
    const cartItemsDiv = document.getElementById('cart-items');
    const billTotalSpan = document.getElementById('bill-total');

    if (!cartItemsDiv || !billTotalSpan) return;

    cartItemsDiv.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Cart is empty.</p>';
    } else {
        const ul = document.createElement('ul');
        cart.forEach((item, index) => {
            const li = document.createElement('li');
            let displayText = '';
            let itemTotal = 0;

            if (item.type === 'single') {
                displayText = `${item.name} (Single) x ${item.quantity}`;
                itemTotal = item.singlePrice * item.quantity;
            } else if (item.type === 'bulk') {
                displayText = `${item.name} (Bulk Pack of ${item.bulkQuantity}) x ${item.quantity}`;
                itemTotal = item.bulkPrice * item.quantity;
            }

            li.innerHTML = `
                <div>${displayText} - ${shopSettings.currencySymbol} ${itemTotal.toFixed(2)}</div>
                <button class="remove-from-cart-btn" data-index="${index}">Remove</button>
            `;
            ul.appendChild(li);
            total += itemTotal;
        });

        cartItemsDiv.appendChild(ul);

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const itemIndexToRemove = parseInt(event.target.dataset.index);
                removeItemFromCart(itemIndexToRemove);
            });
        });
    }

    billTotalSpan.textContent = total.toFixed(2);
}

function updateCashDisplay() {
    const cashTotalSpan = document.getElementById('cash-total');
    if (cashTotalSpan) {
        cashTotalSpan.textContent = cashCounter.toFixed(2);
    }
    updateStatistics();
}

function displaySalesHistory() {
    const salesDateFilter = document.getElementById('sales-date-filter');
    const salesHistoryDiv = document.getElementById('sales-history');

    if (!salesDateFilter || !salesHistoryDiv) return;

    const selectedDate = salesDateFilter.value;
    const filterDate = selectedDate ? new Date(selectedDate).toDateString() : new Date().toDateString();

    salesHistoryDiv.innerHTML = '';

    if (salesHistory.length === 0) {
        salesHistoryDiv.innerHTML = '<p>No sales recorded yet.</p>';
        return;
    }

    // Filter sales by selected date
    const filteredSales = salesHistory.filter(sale =>
        new Date(sale.timestamp).toDateString() === filterDate
    );

    if (filteredSales.length === 0) {
        salesHistoryDiv.innerHTML = '<p>No sales recorded for the selected date.</p>';
        return;
    }

    // Add summary at top
    const daySales = filteredSales.filter(sale => !sale.isReturn && !sale.isReplacement);
    const dayReturns = filteredSales.filter(sale => sale.isReturn);
    const dayTotal = daySales.reduce((sum, sale) => sum + sale.total, 0) -
        Math.abs(dayReturns.reduce((sum, sale) => sum + sale.total, 0));

    // Calculate payment mode breakdown
    const paymentModes = {};
    daySales.forEach(sale => {
        if (!paymentModes[sale.paymentMode]) {
            paymentModes[sale.paymentMode] = 0;
        }
        paymentModes[sale.paymentMode] += sale.total;
    });

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'sales-summary';
    summaryDiv.innerHTML = `
        <h4>Sales Summary for ${filterDate}</h4>
        <p><strong>Total Sales:</strong> ${shopSettings.currencySymbol} ${daySales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}</p>
        <p><strong>Total Returns:</strong> ${shopSettings.currencySymbol} ${Math.abs(dayReturns.reduce((sum, sale) => sum + sale.total, 0)).toFixed(2)}</p>
        <p><strong>Net Total:</strong> ${shopSettings.currencySymbol} ${dayTotal.toFixed(2)}</p>
        <p><strong>Total Transactions:</strong> ${daySales.length}</p>
        ${Object.keys(paymentModes).length > 0 ?
        '<p><strong>Payment Breakdown:</strong> ' +
        Object.entries(paymentModes).map(([mode, amount]) =>
            `${mode.toUpperCase()}: ${shopSettings.currencySymbol} ${amount.toFixed(2)}`
        ).join(', ') + '</p>' :
        ''
    }
    `;
    salesHistoryDiv.appendChild(summaryDiv);

    // Display individual sales
    filteredSales.reverse().forEach(sale => {
        const saleDiv = document.createElement('div');
        saleDiv.className = 'sale-item';

        const saleHeader = document.createElement('div');
        saleHeader.className = 'sale-item-header';
        saleHeader.innerHTML = `
            Sale #${sale.id} - ${new Date(sale.timestamp).toLocaleString()}
            ${sale.isReturn ? '<span class="return-label">RETURN</span>' : ''}
            ${sale.isReplacement ? '<span class="return-label">REPLACEMENT</span>' : ''}
        `;

        const saleDetails = document.createElement('div');
        saleDetails.innerHTML = `
            <strong>Items:</strong><br>
            ${sale.items.map(item => {
            const itemTotal = item.type === 'single' ?
                item.singlePrice * item.quantity :
                item.bulkPrice * item.quantity;
            return `• ${item.name} (${item.type}) x ${item.quantity} = ${shopSettings.currencySymbol} ${itemTotal.toFixed(2)}`;
        }).join('<br>')}
            <br><strong>Total:</strong> ${shopSettings.currencySymbol} ${sale.total.toFixed(2)}
            ${sale.paymentMode ? `<br><strong>Payment Mode:</strong> ${sale.paymentMode.toUpperCase()}` : ''}
            <br><strong>Cashier:</strong> ${sale.cashier}
        `;

        saleDiv.appendChild(saleHeader);
        saleDiv.appendChild(saleDetails);
        salesHistoryDiv.appendChild(saleDiv);
    });
}

// =======================================================
// 9. RETURNS AND REPLACEMENTS SYSTEM (EXACT OLD LOGIC)
// =======================================================
function processReturn(barcode, quantity, reason) {
    const product = findProductByBarcode(barcode);
    if (!product) {
        showMessage('Product not found!', 'error');
        return false;
    }

    const requestedQuantity = parseInt(quantity);
    const isBulk = product.bulkBarcode === barcode;

    // Calculate refund amount
    const refundAmount = isBulk ?
        product.bulkPrice * requestedQuantity :
        product.singlePrice * requestedQuantity;

    // Create return entry for review (exact old logic)
    const returnEntry = {
        id: Date.now(),
        type: 'return',
        productId: product.id,
        productName: product.name,
        barcode: barcode,
        quantity: requestedQuantity,
        unitType: isBulk ? 'bulk' : 'single',
        refundAmount: refundAmount,
        reason: reason,
        timestamp: new Date(),
        cashier: currentUser.name,
        status: 'pending'
    };

    // Add to returned items for review
    returnedItems.push(returnEntry);

    // Save data
    saveDataToStorage();

    // Update displays
    updateReturnsBadge();
    updateReviewBadge();

    // Add notification
    addNotification(`Return initiated: ${product.name} (${shopSettings.currencySymbol} ${refundAmount.toFixed(2)})`, 'warning');

    return true;
}

function processReplacement(oldBarcode, newBarcode, quantity) {
    const oldProduct = findProductByBarcode(oldBarcode);
    const newProduct = findProductByBarcode(newBarcode);

    if (!oldProduct || !newProduct) {
        showMessage('One or both products not found!', 'error');
        return false;
    }

    const requestedQuantity = parseInt(quantity);
    const oldIsBulk = oldProduct.bulkBarcode === oldBarcode;
    const newIsBulk = newProduct.bulkBarcode === newBarcode;

    const newUnits = newIsBulk ? requestedQuantity * newProduct.bulkQuantity : requestedQuantity;

    // Check if new product has enough stock
    if (newProduct.currentStock < newUnits) {
        showMessage('Insufficient stock for replacement product!', 'error');
        return false;
    }

    // Calculate price difference
    const oldPrice = oldIsBulk ? oldProduct.bulkPrice * requestedQuantity : oldProduct.singlePrice * requestedQuantity;
    const newPrice = newIsBulk ? newProduct.bulkPrice * requestedQuantity : newProduct.singlePrice * requestedQuantity;
    const priceDifference = newPrice - oldPrice;

    // Create replacement entry for review (exact old logic)
    const replacementEntry = {
        id: Date.now(),
        type: 'replacement',
        oldProductId: oldProduct.id,
        oldProductName: oldProduct.name,
        oldBarcode: oldBarcode,
        newProductId: newProduct.id,
        newProductName: newProduct.name,
        newBarcode: newBarcode,
        quantity: requestedQuantity,
        oldUnitType: oldIsBulk ? 'bulk' : 'single',
        newUnitType: newIsBulk ? 'bulk' : 'single',
        priceDifference: priceDifference,
        timestamp: new Date(),
        cashier: currentUser.name,
        status: 'pending'
    };

    // Add to returned items for review
    returnedItems.push(replacementEntry);

    // Save data
    saveDataToStorage();

    // Update displays
    updateReturnsBadge();
    updateReviewBadge();

    // Add notification
    const diffText = priceDifference > 0 ?
        `(+${shopSettings.currencySymbol} ${priceDifference.toFixed(2)})` :
        priceDifference < 0 ?
            `(${shopSettings.currencySymbol} ${Math.abs(priceDifference).toFixed(2)} refund)` :
            '(No price difference)';

    addNotification(`Replacement initiated: ${oldProduct.name} → ${newProduct.name} ${diffText}`, 'info');

    return true;
}

function updateReturnsBadge() {
    const returnsCount = document.getElementById('returns-count');
    if (!returnsCount) return;

    const pendingReturns = returnedItems.filter(item => item.status === 'pending' && item.type === 'return').length;
    returnsCount.textContent = pendingReturns;
    returnsCount.style.display = pendingReturns > 0 ? 'flex' : 'none';
}

function updateReviewBadge() {
    const reviewCount = document.getElementById('review-count');
    if (!reviewCount) return;

    const pendingItems = returnedItems.filter(item => item.status === 'pending').length;
    reviewCount.textContent = pendingItems;
    reviewCount.style.display = pendingItems > 0 ? 'flex' : 'none';
}

function displayReviewItems(filter = 'all') {
    const reviewItemsList = document.getElementById('review-items-list');
    if (!reviewItemsList) return;

    reviewItemsList.innerHTML = '';

    let itemsToShow = returnedItems;

    if (filter === 'returns') {
        itemsToShow = returnedItems.filter(item => item.type === 'return');
    } else if (filter === 'replacements') {
        itemsToShow = returnedItems.filter(item => item.type === 'replacement');
    }

    if (itemsToShow.length === 0) {
        reviewItemsList.innerHTML = '<p>No items pending review.</p>';
        return;
    }

    itemsToShow.reverse().forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'review-item';

        let contentHtml = '';

        if (item.type === 'return') {
            contentHtml = `
                <div class="review-item-header">
                    <span class="review-item-type return">RETURN</span>
                    <span>${new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <div class="review-item-details">
                    <strong>Product:</strong> ${item.productName}<br>
                    <strong>Barcode:</strong> ${item.barcode}<br>
                    <strong>Quantity:</strong> ${item.quantity} (${item.unitType})<br>
                    <strong>Refund Amount:</strong> ${shopSettings.currencySymbol} ${item.refundAmount.toFixed(2)}<br>
                    <strong>Reason:</strong> ${item.reason}<br>
                    <strong>Cashier:</strong> ${item.cashier}
                </div>
            `;
        } else if (item.type === 'replacement') {
            contentHtml = `
                <div class="review-item-header">
                    <span class="review-item-type replacement">REPLACEMENT</span>
                    <span>${new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <div class="review-item-details">
                    <strong>Old Product:</strong> ${item.oldProductName} (${item.oldBarcode})<br>
                    <strong>New Product:</strong> ${item.newProductName} (${item.newBarcode})<br>
                    <strong>Quantity:</strong> ${item.quantity}<br>
                    <strong>Price Difference:</strong> ${shopSettings.currencySymbol} ${item.priceDifference.toFixed(2)}<br>
                    <strong>Cashier:</strong> ${item.cashier}
                </div>
            `;
        }

        contentHtml += `
            <div class="review-item-actions">
                <button class="btn-success approve-item-btn" data-id="${item.id}">Approve - Add to Stock</button>
                <button class="btn-danger reject-item-btn" data-id="${item.id}">Reject - Cannot sell</button>
            </div>
        `;

        itemDiv.innerHTML = contentHtml;
        reviewItemsList.appendChild(itemDiv);
    });

    // Add event listeners for approve/reject buttons
    document.querySelectorAll('.approve-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = parseInt(e.target.dataset.id);
            approveReviewItem(itemId);
        });
    });

    document.querySelectorAll('.reject-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = parseInt(e.target.dataset.id);
            if (confirm('Are you sure you want to reject this item?')) {
                rejectReviewItem(itemId);
            }
        });
    });
}

// FIXED: Exact old logic for approval - stock gets restored and can be sold again
function approveReviewItem(itemId) {
    const item = returnedItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'return') {
        // Process the return - add stock back and create negative sale (exact old logic)
        const product = products.find(p => p.id === item.productId);
        if (product) {
            const unitsToReturn = item.unitType === 'bulk' ?
                item.quantity * product.bulkQuantity :
                item.quantity;

            // FIXED: Add stock back so it can be sold again
            product.currentStock += unitsToReturn;
            product.lastUpdated = new Date();

            // Create negative sale entry
            const returnSale = {
                id: Date.now(),
                items: [{
                    productId: product.id,
                    name: product.name,
                    type: item.unitType,
                    quantity: item.quantity,
                    singlePrice: product.singlePrice,
                    bulkPrice: product.bulkPrice,
                    bulkQuantity: product.bulkQuantity,
                    barcode: item.barcode
                }],
                total: -item.refundAmount,
                paymentMode: 'RETURN',
                timestamp: new Date(),
                cashier: currentUser.name,
                isReturn: true,
                isReplacement: false,
                returnReason: item.reason
            };

            salesHistory.push(returnSale);

            // Update cash counter
            cashCounter -= item.refundAmount;
        }
    } else if (item.type === 'replacement') {
        // Process the replacement - update stock and create sale if needed (exact old logic)
        const oldProduct = products.find(p => p.id === item.oldProductId);
        const newProduct = products.find(p => p.id === item.newProductId);

        if (oldProduct && newProduct) {
            const oldUnits = item.oldUnitType === 'bulk' ?
                item.quantity * oldProduct.bulkQuantity :
                item.quantity;
            const newUnits = item.newUnitType === 'bulk' ?
                item.quantity * newProduct.bulkQuantity :
                item.quantity;

            // FIXED: Update stock so old product can be sold again
            oldProduct.currentStock += oldUnits; // Add back old product
            newProduct.currentStock -= newUnits; // Remove new product
            oldProduct.lastUpdated = new Date();
            newProduct.lastUpdated = new Date();

            // Create replacement sale entry if there's a price difference
            if (item.priceDifference !== 0) {
                const replacementSale = {
                    id: Date.now(),
                    items: [{
                        productId: newProduct.id,
                        name: `${oldProduct.name} → ${newProduct.name}`,
                        type: 'replacement',
                        quantity: item.quantity,
                        singlePrice: item.priceDifference,
                        bulkPrice: item.priceDifference,
                        bulkQuantity: 1,
                        barcode: `${item.oldBarcode} → ${item.newBarcode}`
                    }],
                    total: item.priceDifference,
                    paymentMode: 'REPLACEMENT',
                    timestamp: new Date(),
                    cashier: currentUser.name,
                    isReturn: false,
                    isReplacement: true
                };

                salesHistory.push(replacementSale);

                // Update cash counter
                cashCounter += item.priceDifference;
            }
        }
    }

    // Mark item as approved
    item.status = 'approved';
    item.approvedBy = currentUser.name;
    item.approvedAt = new Date();

    saveDataToStorage();
    displayReviewItems();
    updateReturnsBadge();
    updateReviewBadge();
    updateCashDisplay();
    displayInventory();
    updateStatistics();

    showMessage(`${item.type === 'return' ? 'Return' : 'Replacement'} approved successfully! Stock updated for resale.`, 'success');
}

function rejectReviewItem(itemId) {
    const item = returnedItems.find(i => i.id === itemId);
    if (!item) return;

    // Mark item as rejected
    item.status = 'rejected';
    item.rejectedBy = currentUser.name;
    item.rejectedAt = new Date();

    saveDataToStorage();
    displayReviewItems();
    updateReturnsBadge();
    updateReviewBadge();

    showMessage(`${item.type === 'return' ? 'Return' : 'Replacement'} rejected successfully!`, 'info');
}

// =======================================================
// 10. CASH COUNTER FUNCTIONS
// =======================================================
function viewSalesHistory() {
    const section = document.getElementById('sales-history-section');
    if (!section) return;

    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
        displaySalesHistory();
    } else {
        section.style.display = 'none';
    }
}

function exportPDFReport() {
    const salesDateFilter = document.getElementById('sales-date-filter');
    if (!salesDateFilter) return;

    const selectedDate = salesDateFilter.value;
    const filterDate = selectedDate ? new Date(selectedDate).toDateString() : new Date().toDateString();

    // Filter sales by selected date
    const filteredSales = salesHistory.filter(sale =>
        new Date(sale.timestamp).toDateString() === filterDate
    );

    if (filteredSales.length === 0) {
        showMessage('No sales data found for the selected date', 'error');
        return;
    }

    try {
        // Create PDF
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        let y = 20;

        // Header
        doc.setFontSize(16);
        doc.text(shopSettings.shopName, 20, y);
        y += 10;
        doc.setFontSize(12);
        doc.text(`Sales Report - ${filterDate}`, 20, y);
        y += 10;
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
        y += 15;

        // Summary
        const daySales = filteredSales.filter(sale => !sale.isReturn && !sale.isReplacement);
        const dayReturns = filteredSales.filter(sale => sale.isReturn);
        const dayTotal = daySales.reduce((sum, sale) => sum + sale.total, 0) -
            Math.abs(dayReturns.reduce((sum, sale) => sum + sale.total, 0));

        doc.setFontSize(14);
        doc.text('Summary:', 20, y);
        y += 10;
        doc.setFontSize(10);
        doc.text(`Total Sales: ${shopSettings.currencySymbol} ${daySales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}`, 20, y);
        y += 6;
        doc.text(`Total Returns: ${shopSettings.currencySymbol} ${Math.abs(dayReturns.reduce((sum, sale) => sum + sale.total, 0)).toFixed(2)}`, 20, y);
        y += 6;
        doc.text(`Net Total: ${shopSettings.currencySymbol} ${dayTotal.toFixed(2)}`, 20, y);
        y += 6;
        doc.text(`Total Transactions: ${daySales.length}`, 20, y);
        y += 15;

        // Sales details
        doc.setFontSize(12);
        doc.text('Sales Details:', 20, y);
        y += 10;

        filteredSales.forEach((sale, index) => {
            if (y > pageHeight - 40) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(10);
            doc.text(`${index + 1}. Sale #${sale.id} - ${new Date(sale.timestamp).toLocaleString()}`, 20, y);
            y += 6;
            doc.text(`   Total: ${shopSettings.currencySymbol} ${sale.total.toFixed(2)} | Payment: ${sale.paymentMode || 'N/A'}`, 20, y);
            y += 6;
            doc.text(`   Cashier: ${sale.cashier}`, 20, y);
            y += 6;

            if (sale.isReturn) {
                doc.text(`   ** RETURN **`, 20, y);
                y += 6;
            }
            if (sale.isReplacement) {
                doc.text(`   ** REPLACEMENT **`, 20, y);
                y += 6;
            }

            y += 4;
        });

        // Save PDF
        const fileName = `sales_report_${selectedDate || new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        showMessage('PDF report exported successfully!', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showMessage('Error generating PDF report!', 'error');
    }
}

function showPaymentSummary() {
    const paymentSummaryDate = document.getElementById('payment-summary-date');
    const paymentSummaryTable = document.getElementById('payment-summary-table');
    const paymentSummaryModal = document.getElementById('payment-summary-modal');

    if (!paymentSummaryDate || !paymentSummaryTable || !paymentSummaryModal) return;

    const selectedDate = paymentSummaryDate.value;
    const filterDate = selectedDate ? new Date(selectedDate).toDateString() : new Date().toDateString();

    // Filter sales by selected date
    const filteredSales = salesHistory.filter(sale =>
        new Date(sale.timestamp).toDateString() === filterDate &&
        !sale.isReturn &&
        !sale.isReplacement
    );

    // Calculate payment mode breakdown
    const paymentModes = {};
    filteredSales.forEach(sale => {
        const mode = sale.paymentMode || 'CASH';
        if (!paymentModes[mode]) {
            paymentModes[mode] = {
                count: 0,
                amount: 0
            };
        }
        paymentModes[mode].count++;
        paymentModes[mode].amount += sale.total;
    });

    // Create table HTML
    let tableHtml = `
        <h3>Payment Summary for ${filterDate}</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Payment Mode</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Transactions</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Amount</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalAmount = 0;
    let totalTransactions = 0;

    Object.entries(paymentModes).forEach(([mode, data]) => {
        tableHtml += `
            <tr>
                <td style="padding: 12px; border: 1px solid #ddd;">${mode}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${data.count}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${shopSettings.currencySymbol} ${data.amount.toFixed(2)}</td>
            </tr>
        `;
        totalAmount += data.amount;
        totalTransactions += data.count;
    });

    tableHtml += `
            <tr style="background-color: #e8f5e9; font-weight: bold;">
                <td style="padding: 12px; border: 1px solid #ddd;"><strong>TOTAL</strong></td>
                <td style="padding: 12px; border: 1px solid #ddd;"><strong>${totalTransactions}</strong></td>
                <td style="padding: 12px; border: 1px solid #ddd;"><strong>${shopSettings.currencySymbol} ${totalAmount.toFixed(2)}</strong></td>
            </tr>
        </tbody>
    </table>
    `;

    if (Object.keys(paymentModes).length === 0) {
        tableHtml = '<p>No payment data found for the selected date.</p>';
    }

    paymentSummaryTable.innerHTML = tableHtml;
    paymentSummaryModal.style.display = 'block';
}

function resetCashCounter() {
    if (!isOwnerLoggedIn) {
        showMessage('Only the owner can reset the cash counter', 'error');
        return;
    }

    const resetCashModal = document.getElementById('reset-cash-modal');
    if (resetCashModal) {
        resetCashModal.style.display = 'block';
    }
}

function confirmResetCash() {
    const resetCashConfirmationInput = document.getElementById('reset-cash-confirmation');
    const resetCashModal = document.getElementById('reset-cash-modal');

    if (!resetCashConfirmationInput || !resetCashModal) return;

    const confirmation = resetCashConfirmationInput.value;

    if (confirmation !== 'RESET') {
        showMessage('Please type "RESET" to confirm', 'error');
        return;
    }

    cashCounter = 0;
    saveDataToStorage();
    updateCashDisplay();

    resetCashModal.style.display = 'none';
    resetCashConfirmationInput.value = '';

    addNotification('Cash counter reset to zero', 'warning');
    showMessage('Cash counter reset successfully!', 'success');
}

// =======================================================
// 11. SETTINGS FUNCTIONS
// =======================================================
function showSettings() {
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal) return;

    // Load current settings
    const shopNameInput = document.getElementById('shop-name-setting');
    const openTimeInput = document.getElementById('shop-open-time');
    const closeTimeInput = document.getElementById('shop-close-time');
    const lowStockThresholdInput = document.getElementById('low-stock-threshold');
    const autoPrintCheckbox = document.getElementById('auto-print-receipts');
    const soundNotificationsCheckbox = document.getElementById('sound-notifications');
    const autoBackupCheckbox = document.getElementById('auto-backup');
    const currencySelect = document.getElementById('currency-symbol');

    if (shopNameInput) shopNameInput.value = shopSettings.shopName;
    if (openTimeInput) openTimeInput.value = shopSettings.openTime;
    if (closeTimeInput) closeTimeInput.value = shopSettings.closeTime;
    if (lowStockThresholdInput) lowStockThresholdInput.value = shopSettings.lowStockThreshold;
    if (autoPrintCheckbox) autoPrintCheckbox.checked = shopSettings.autoPrintReceipts;
    if (soundNotificationsCheckbox) soundNotificationsCheckbox.checked = shopSettings.soundNotifications;
    if (autoBackupCheckbox) autoBackupCheckbox.checked = shopSettings.autoBackup;
    if (currencySelect) currencySelect.value = shopSettings.currencySymbol;

    // Update system info
    updateSystemInfo();

    settingsModal.style.display = 'block';
}

function updateSystemInfo() {
    const productCountSpan = document.getElementById('system-product-count');
    const databaseSizeSpan = document.getElementById('database-size');
    const lastBackupSpan = document.getElementById('last-backup-time');

    if (productCountSpan) productCountSpan.textContent = products.length;

    // Calculate approximate database size
    const dataSize = JSON.stringify({
        products, salesHistory, returnedItems, notifications
    }).length;
    const sizeInKB = Math.round(dataSize / 1024);
    if (databaseSizeSpan) databaseSizeSpan.textContent = `${sizeInKB} KB`;

    // Last backup time (placeholder)
    if (lastBackupSpan) lastBackupSpan.textContent = 'Manual only';
}

function saveShopSettings(event) {
    event.preventDefault();

    const shopNameInput = document.getElementById('shop-name-setting');
    const openTimeInput = document.getElementById('shop-open-time');
    const closeTimeInput = document.getElementById('shop-close-time');
    const lowStockThresholdInput = document.getElementById('low-stock-threshold');

    if (shopNameInput) shopSettings.shopName = shopNameInput.value;
    if (openTimeInput) shopSettings.openTime = openTimeInput.value;
    if (closeTimeInput) shopSettings.closeTime = closeTimeInput.value;
    if (lowStockThresholdInput) shopSettings.lowStockThreshold = parseInt(lowStockThresholdInput.value);

    saveDataToStorage();
    updateStatistics();

    showMessage('Shop settings saved successfully!', 'success');
}

function savePreferences(event) {
    event.preventDefault();

    const autoPrintCheckbox = document.getElementById('auto-print-receipts');
    const soundNotificationsCheckbox = document.getElementById('sound-notifications');
    const autoBackupCheckbox = document.getElementById('auto-backup');
    const currencySelect = document.getElementById('currency-symbol');

    if (autoPrintCheckbox) shopSettings.autoPrintReceipts = autoPrintCheckbox.checked;
    if (soundNotificationsCheckbox) shopSettings.soundNotifications = soundNotificationsCheckbox.checked;
    if (autoBackupCheckbox) shopSettings.autoBackup = autoBackupCheckbox.checked;
    if (currencySelect) shopSettings.currencySymbol = currencySelect.value;

    saveDataToStorage();

    showMessage('Preferences saved successfully!', 'success');
}

function clearCache() {
    // Clear old notifications
    notifications = notifications.filter(n => {
        const daysDiff = (new Date() - new Date(n.timestamp)) / (1000 * 60 * 60 * 24);
        return daysDiff < 7; // Keep notifications for 7 days
    });

    saveNotifications();
    updateNotificationDisplay();

    showMessage('Cache cleared successfully!', 'success');
}

function backupNow() {
    exportAllData();

    // Update last backup time
    const lastBackupSpan = document.getElementById('last-backup-time');
    if (lastBackupSpan) lastBackupSpan.textContent = new Date().toLocaleString();

    showMessage('Backup created successfully!', 'success');
}

// =======================================================
// 12. RESET STORE FUNCTIONS
// =======================================================
function resetStore() {
    const resetStoreModal = document.getElementById('reset-store-modal');
    if (resetStoreModal) {
        resetStoreModal.style.display = 'block';
    }
}

function confirmResetStore() {
    const resetStoreModal = document.getElementById('reset-store-modal');
    const resetStoreFinalModal = document.getElementById('reset-store-final-modal');

    if (resetStoreModal) resetStoreModal.style.display = 'none';
    if (resetStoreFinalModal) resetStoreFinalModal.style.display = 'block';
}

function finalResetStore() {
    const resetStoreConfirmationInput = document.getElementById('reset-store-confirmation');
    const resetStoreFinalModal = document.getElementById('reset-store-final-modal');

    if (!resetStoreConfirmationInput || !resetStoreFinalModal) return;

    const confirmation = resetStoreConfirmationInput.value;

    if (confirmation !== 'RESET STORE') {
        showMessage('Please type "RESET STORE" to confirm', 'error');
        return;
    }

    // Reset all data
    products = [];
    nextProductId = 1;
    cart = [];
    cashCounter = 0;
    salesHistory = [];
    notifications = [];
    returnedItems = [];

    // Clear localStorage
    localStorage.removeItem('stationeryShop_products');
    localStorage.removeItem('stationeryShop_salesHistory');
    localStorage.removeItem('stationeryShop_cashCounter');
    localStorage.removeItem('stationeryShop_returnedItems');
    localStorage.removeItem('stationeryShop_nextProductId');
    localStorage.removeItem('stationeryShop_notifications');
    localStorage.removeItem('stationeryShop_shopSettings');

    // Update all displays
    displayProducts();
    displayInventory();
    displaySalesHistory();
    updateCartDisplay();
    updateCashDisplay();
    updateReturnsBadge();
    updateReviewBadge();
    updateNotificationDisplay();
    updateStatistics();
    updateStockProductDropdown();

    // Hide modal
    resetStoreFinalModal.style.display = 'none';
    resetStoreConfirmationInput.value = '';

    showMessage('Store data reset successfully!', 'success');
}

// =======================================================
// 13. USER MANAGEMENT
// =======================================================
function showLogin() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.style.display = 'block';
    }
}

function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const userType = document.getElementById('login-user-type').value;
    const loginModal = document.getElementById('login-modal');

    if (userType === 'owner' && password === OWNER_PASSWORD) {
        currentUser = { name: username || 'Owner', type: 'owner' };
        isOwnerLoggedIn = true;
        showMessage('Owner logged in successfully!', 'success');
    } else if (userType === 'shopkeeper' && password === SHOPKEEPER_PASSWORD) {
        currentUser = { name: username || 'Shopkeeper', type: 'shopkeeper' };
        isOwnerLoggedIn = false;
        showMessage('Shopkeeper logged in successfully!', 'success');
    } else {
        showMessage('Invalid credentials!', 'error');
        return;
    }

    // Update UI
    const userNameSpan = document.getElementById('user-name');
    const dropdownUserName = document.getElementById('dropdown-user-name');
    const userRole = document.querySelector('.user-role');

    if (userNameSpan) userNameSpan.textContent = currentUser.name;
    if (dropdownUserName) dropdownUserName.textContent = currentUser.name;
    if (userRole) userRole.textContent = currentUser.type === 'owner' ? 'Owner' : 'Staff';

    // Hide login modal
    if (loginModal) loginModal.style.display = 'none';

    // Clear form
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.reset();
}

function logout() {
    currentUser = { name: 'Shopkeeper', type: 'shopkeeper' };
    isOwnerLoggedIn = false;

    // Update UI
    const userNameSpan = document.getElementById('user-name');
    const dropdownUserName = document.getElementById('dropdown-user-name');
    const userRole = document.querySelector('.user-role');

    if (userNameSpan) userNameSpan.textContent = currentUser.name;
    if (dropdownUserName) dropdownUserName.textContent = currentUser.name;
    if (userRole) userRole.textContent = 'Staff';

    showMessage('Logged out successfully!', 'info');
}

// =======================================================
// 14. IMPORT/EXPORT FUNCTIONS
// =======================================================
function exportAllData() {
    const allData = {
        products: products,
        salesHistory: salesHistory,
        cashCounter: cashCounter,
        returnedItems: returnedItems,
        nextProductId: nextProductId,
        notifications: notifications,
        shopSettings: shopSettings,
        exportDate: new Date().toISOString(),
        version: '2.0'
    };

    const dataBlob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `shop_data_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    showMessage('Data exported successfully!', 'success');
}

function importData() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];

    if (!file) {
        showMessage('Please select a file to import', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Validate data structure
            if (!importedData.products || !Array.isArray(importedData.products)) {
                throw new Error('Invalid data format');
            }

            // Confirm import
            if (confirm('This will replace all current data. Are you sure?')) {
                // Import data
                products = importedData.products || [];
                salesHistory = importedData.salesHistory || [];
                cashCounter = importedData.cashCounter || 0;
                returnedItems = importedData.returnedItems || [];
                nextProductId = importedData.nextProductId || 1;
                notifications = importedData.notifications || [];
                shopSettings = { ...shopSettings, ...(importedData.shopSettings || {}) };

                // Convert date strings back to Date objects
                products.forEach(product => {
                    if (product.dateAdded) product.dateAdded = new Date(product.dateAdded);
                    if (product.lastUpdated) product.lastUpdated = new Date(product.lastUpdated);
                });

                salesHistory.forEach(sale => {
                    if (sale.timestamp) sale.timestamp = new Date(sale.timestamp);
                });

                returnedItems.forEach(item => {
                    if (item.timestamp) item.timestamp = new Date(item.timestamp);
                });

                notifications.forEach(notification => {
                    if (notification.timestamp) notification.timestamp = new Date(notification.timestamp);
                });

                // Save to localStorage
                saveDataToStorage();
                saveNotifications();

                // Update all displays
                displayProducts();
                displayInventory();
                displaySalesHistory();
                updateCartDisplay();
                updateCashDisplay();
                updateReturnsBadge();
                updateReviewBadge();
                updateNotificationDisplay();
                updateStatistics();
                updateStockProductDropdown();

                showMessage('Data imported successfully!', 'success');

                // Clear file input
                fileInput.value = '';
            }
        } catch (error) {
            console.error('Import error:', error);
            showMessage('Error importing data. Please check the file format.', 'error');
        }
    };

    reader.readAsText(file);
}

// =======================================================
// 15. SEARCH FUNCTIONS
// =======================================================
function performQuickSearch() {
    const quickSearchInput = document.getElementById('quick-search');
    const inventoryListDiv = document.getElementById('inventory-list');

    if (!quickSearchInput || !inventoryListDiv) return;

    const searchTerm = quickSearchInput.value.toLowerCase();
    if (!searchTerm) {
        displayInventory();
        return;
    }

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.singleBarcode.includes(searchTerm) ||
        product.bulkBarcode.includes(searchTerm)
    );

    inventoryListDiv.innerHTML = '';

    if (filteredProducts.length === 0) {
        inventoryListDiv.innerHTML = '<p>No products match your search criteria.</p>';
        return;
    }

    const ul = document.createElement('ul');
    filteredProducts.forEach(product => {
        const stockInfo = calculateStockDisplay(product);
        const li = document.createElement('li');

        let stockStatus = 'good-stock';
        let stockStatusText = 'Good Stock';

        if (product.currentStock === 0) {
            stockStatus = 'out-of-stock';
            stockStatusText = 'Out of Stock';
        } else if (product.currentStock < shopSettings.lowStockThreshold) {
            stockStatus = 'low-stock';
            stockStatusText = 'Low Stock';
        }

        li.className = stockStatus;

        // Highlight search term
        const nameHighlighted = product.name.replace(
            new RegExp(searchTerm, 'gi'),
            `<span class="search-highlight">$&</span>`
        );

        li.innerHTML = `
            <strong>${nameHighlighted}</strong> - 
            <span class="stock-display ${stockStatus}">${stockInfo}</span>
            <span class="stock-status-indicator ${stockStatus}">${stockStatusText}</span>
            <div class="stock-info">
                Single: <code>${product.singleBarcode}</code> (${shopSettings.currencySymbol} ${product.singlePrice.toFixed(2)}) | 
                Bulk: <code>${product.bulkBarcode}</code> (${shopSettings.currencySymbol} ${product.bulkPrice.toFixed(2)}) - ${product.bulkQuantity} units per pack
            </div>
        `;
        ul.appendChild(li);
    });

    inventoryListDiv.appendChild(ul);
}

function showLowStockOnly() {
    const lowStockProducts = products.filter(p =>
        p.currentStock > 0 &&
        p.currentStock < shopSettings.lowStockThreshold
    );
    const outOfStockProducts = products.filter(p => p.currentStock === 0);

    const inventoryListDiv = document.getElementById('inventory-list');
    if (!inventoryListDiv) return;

    inventoryListDiv.innerHTML = '';

    if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
        inventoryListDiv.innerHTML = '<p>No low stock or out of stock products found.</p>';
        return;
    }

    const ul = document.createElement('ul');

    // Show out of stock first
    outOfStockProducts.forEach(product => {
        const li = document.createElement('li');
        li.className = 'out-of-stock';
        li.innerHTML = `
            <strong>${product.name}</strong> - 
            <span class="stock-display out-of-stock">Out of Stock</span>
            <span class="stock-status-indicator out-of-stock">Out of Stock</span>
            <div class="stock-info">
                Single: <code>${product.singleBarcode}</code> (${shopSettings.currencySymbol} ${product.singlePrice.toFixed(2)}) | 
                Bulk: <code>${product.bulkBarcode}</code> (${shopSettings.currencySymbol} ${product.bulkPrice.toFixed(2)}) - ${product.bulkQuantity} units per pack
            </div>
        `;
        ul.appendChild(li);
    });

    // Then show low stock
    lowStockProducts.forEach(product => {
        const stockInfo = calculateStockDisplay(product);
        const li = document.createElement('li');
        li.className = 'low-stock';
        li.innerHTML = `
            <strong>${product.name}</strong> - 
            <span class="stock-display low-stock">${stockInfo}</span>
            <span class="stock-status-indicator low-stock">Low Stock</span>
            <div class="stock-info">
                Single: <code>${product.singleBarcode}</code> (${shopSettings.currencySymbol} ${product.singlePrice.toFixed(2)}) | 
                Bulk: <code>${product.bulkBarcode}</code> (${shopSettings.currencySymbol} ${product.bulkPrice.toFixed(2)}) - ${product.bulkQuantity} units per pack
            </div>
        `;
        ul.appendChild(li);
    });

    inventoryListDiv.appendChild(ul);
}

// =======================================================
// 16. EVENT LISTENERS AND INITIALIZATION
// =======================================================
document.addEventListener('DOMContentLoaded', function() {
    // Load saved data
    loadDataFromStorage();
    loadNotifications();

    // Initialize displays
    updateDateTime();
    setInterval(updateDateTime, 1000);
    displayProducts();
    displayInventory();
    displaySalesHistory();
    updateCartDisplay();
    updateCashDisplay();
    updateReturnsBadge();
    updateReviewBadge();
    updateNotificationDisplay();
    updateStatistics();
    updateStockProductDropdown();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    const salesDateFilter = document.getElementById('sales-date-filter');
    const paymentSummaryDate = document.getElementById('payment-summary-date');

    if (salesDateFilter) salesDateFilter.value = today;
    if (paymentSummaryDate) paymentSummaryDate.value = today;

    // =======================================================
    // PRODUCT MANAGEMENT EVENT LISTENERS
    // =======================================================
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const name = document.getElementById('product-name').value.trim();
            const singleBarcode = document.getElementById('single-barcode').value.trim();
            const singlePrice = document.getElementById('single-price').value;
            const bulkBarcode = document.getElementById('bulk-barcode').value.trim();
            const bulkPrice = document.getElementById('bulk-price').value;
            const bulkQuantity = document.getElementById('bulk-quantity').value;
            const initialStock = document.getElementById('initial-stock').value || 0;
            const initialBoxes = document.getElementById('initial-boxes').value || 0;

            if (name && singleBarcode && singlePrice && bulkBarcode && bulkPrice && bulkQuantity) {
                addProduct(name, singleBarcode, singlePrice, bulkBarcode, bulkPrice, bulkQuantity, initialStock, initialBoxes);
            }
        });
    }

    // =======================================================
    // STOCK MANAGEMENT EVENT LISTENERS
    // =======================================================
    const addStockForm = document.getElementById('add-stock-form');
    if (addStockForm) {
        addStockForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const productId = document.getElementById('stock-product-select').value;
            const singleUnits = document.getElementById('add-single-units').value || 0;
            const bulkBoxes = document.getElementById('add-bulk-boxes').value || 0;

            if (productId && (parseInt(singleUnits) > 0 || parseInt(bulkBoxes) > 0)) {
                addStock(productId, singleUnits, bulkBoxes);
            }
        });
    }

    // =======================================================
    // POS EVENT LISTENERS
    // =======================================================
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            const barcode = document.getElementById('barcode-input').value.trim();
            const quantity = document.getElementById('pos-quantity-input').value || 1;

            if (barcode) {
                addToCart(barcode, quantity);
            }
        });
    }

    // Allow Enter key to add to cart
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const addToCartBtn = document.getElementById('add-to-cart-btn');
                if (addToCartBtn) addToCartBtn.click();
            }
        });
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }

    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }

    // =======================================================
    // CASH COUNTER EVENT LISTENERS
    // =======================================================
    const viewSalesBtn = document.getElementById('view-sales-btn');
    if (viewSalesBtn) {
        viewSalesBtn.addEventListener('click', viewSalesHistory);
    }

    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportPDFReport);
    }

    const paymentSummaryBtn = document.getElementById('payment-summary-btn');
    if (paymentSummaryBtn) {
        paymentSummaryBtn.addEventListener('click', showPaymentSummary);
    }

    const resetCashBtn = document.getElementById('reset-cash-btn');
    if (resetCashBtn) {
        resetCashBtn.addEventListener('click', resetCashCounter);
    }

    // Sales date filter
    if (salesDateFilter) {
        salesDateFilter.addEventListener('change', displaySalesHistory);
    }

    // Payment summary date filter
    if (paymentSummaryDate) {
        paymentSummaryDate.addEventListener('change', showPaymentSummary);
    }

    // =======================================================
    // IMPORT/EXPORT EVENT LISTENERS
    // =======================================================
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', exportAllData);
    }

    const importDataBtn = document.getElementById('import-data-btn');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', importData);
    }

    // =======================================================
    // SEARCH EVENT LISTENERS
    // =======================================================
    const quickSearchBtn = document.getElementById('quick-search-btn');
    if (quickSearchBtn) {
        quickSearchBtn.addEventListener('click', performQuickSearch);
    }

    const quickSearchInput = document.getElementById('quick-search');
    if (quickSearchInput) {
        quickSearchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                performQuickSearch();
            }
        });
    }

    // Inventory search
    const inventorySearch = document.getElementById('inventory-search');
    if (inventorySearch) {
        inventorySearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            if (!searchTerm) {
                displayInventory();
                return;
            }

            const filteredProducts = products.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.singleBarcode.includes(searchTerm) ||
                product.bulkBarcode.includes(searchTerm)
            );

            const inventoryListDiv = document.getElementById('inventory-list');
            if (!inventoryListDiv) return;

            inventoryListDiv.innerHTML = '';

            if (filteredProducts.length === 0) {
                inventoryListDiv.innerHTML = '<p>No products match your search criteria.</p>';
                return;
            }

            const ul = document.createElement('ul');
            filteredProducts.forEach(product => {
                const stockInfo = calculateStockDisplay(product);
                const li = document.createElement('li');

                let stockStatus = 'good-stock';
                let stockStatusText = 'Good Stock';

                if (product.currentStock === 0) {
                    stockStatus = 'out-of-stock';
                    stockStatusText = 'Out of Stock';
                } else if (product.currentStock < shopSettings.lowStockThreshold) {
                    stockStatus = 'low-stock';
                    stockStatusText = 'Low Stock';
                }

                li.className = stockStatus;

                li.innerHTML = `
                    <strong>${product.name}</strong> - 
                    <span class="stock-display ${stockStatus}">${stockInfo}</span>
                    <span class="stock-status-indicator ${stockStatus}">${stockStatusText}</span>
                    <div class="stock-info">
                        Single: <code>${product.singleBarcode}</code> (${shopSettings.currencySymbol} ${product.singlePrice.toFixed(2)}) | 
                        Bulk: <code>${product.bulkBarcode}</code> (${shopSettings.currencySymbol} ${product.bulkPrice.toFixed(2)}) - ${product.bulkQuantity} units per pack
                    </div>
                `;
                ul.appendChild(li);
            });

            inventoryListDiv.appendChild(ul);
        });
    }

    // Low stock filter
    const showLowStockBtn = document.getElementById('show-low-stock-btn');
    if (showLowStockBtn) {
        showLowStockBtn.addEventListener('click', showLowStockOnly);
    }

    // =======================================================
    // PAYMENT MODAL EVENT LISTENERS
    // =======================================================
    const cashPaymentBtn = document.getElementById('cash-payment');
    if (cashPaymentBtn) {
        cashPaymentBtn.addEventListener('click', () => processPayment('cash'));
    }

    const upiPaymentBtn = document.getElementById('upi-payment');
    if (upiPaymentBtn) {
        upiPaymentBtn.addEventListener('click', () => processPayment('upi'));
    }

    const cardPaymentBtn = document.getElementById('card-payment');
    if (cardPaymentBtn) {
        cardPaymentBtn.addEventListener('click', () => processPayment('card'));
    }

    const cancelPaymentBtn = document.getElementById('cancel-payment');
    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener
        cancelPaymentBtn.addEventListener('click', cancelPayment);
    }

    // Payment Confirmation Modal Event Listeners
    const paymentReceivedBtn = document.getElementById('payment-received');
    if (paymentReceivedBtn) {
        paymentReceivedBtn.addEventListener('click', confirmPayment);
    }

    const paymentCancelledBtn = document.getElementById('payment-cancelled');
    if (paymentCancelledBtn) {
        paymentCancelledBtn.addEventListener('click', cancelPayment);
    }

    // Modal close event listeners
    const closePaymentModeBtn = document.querySelector('.close-payment-mode');
    if (closePaymentModeBtn) {
        closePaymentModeBtn.addEventListener('click', () => {
            const paymentModeModal = document.getElementById('payment-mode-modal');
            if (paymentModeModal) paymentModeModal.style.display = 'none';
        });
    }

    // =======================================================
    // SETTINGS EVENT LISTENERS
    // =======================================================
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettings);
    }

    const closeSettingsModal = document.querySelector('.close-settings-modal');
    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', () => {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }

    // Settings tab system
    const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
    const settingsTabContents = document.querySelectorAll('.settings-tab-content');

    settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.dataset.tab;

            // Remove active class from all tabs
            settingsTabBtns.forEach(tab => tab.classList.remove('active'));
            settingsTabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-settings-tab`);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // Shop settings form
    const shopSettingsForm = document.getElementById('shop-settings-form');
    if (shopSettingsForm) {
        shopSettingsForm.addEventListener('submit', saveShopSettings);
    }

    // Preferences form
    const preferencesForm = document.getElementById('preferences-settings-form');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', savePreferences);
    }

    // System actions
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', clearCache);
    }

    const backupNowBtn = document.getElementById('backup-now-btn');
    if (backupNowBtn) {
        backupNowBtn.addEventListener('click', backupNow);
    }

    const systemResetBtn = document.getElementById('system-reset-btn');
    if (systemResetBtn) {
        systemResetBtn.addEventListener('click', resetStore);
    }

    // =======================================================
    // RESET STORE EVENT LISTENERS
    // =======================================================
    const resetStoreBtn = document.getElementById('reset-store-btn');
    if (resetStoreBtn) {
        resetStoreBtn.addEventListener('click', resetStore);
    }

    const confirmResetStoreBtn = document.getElementById('confirm-reset-store');
    if (confirmResetStoreBtn) {
        confirmResetStoreBtn.addEventListener('click', confirmResetStore);
    }

    const cancelResetStoreBtn = document.getElementById('cancel-reset-store');
    if (cancelResetStoreBtn) {
        cancelResetStoreBtn.addEventListener('click', () => {
            const resetStoreModal = document.getElementById('reset-store-modal');
            if (resetStoreModal) resetStoreModal.style.display = 'none';
        });
    }

    const finalResetStoreBtn = document.getElementById('final-reset-store');
    if (finalResetStoreBtn) {
        finalResetStoreBtn.addEventListener('click', finalResetStore);
    }

    const cancelFinalResetBtn = document.getElementById('cancel-final-reset');
    if (cancelFinalResetBtn) {
        cancelFinalResetBtn.addEventListener('click', () => {
            const resetStoreFinalModal = document.getElementById('reset-store-final-modal');
            const resetStoreConfirmationInput = document.getElementById('reset-store-confirmation');
            if (resetStoreFinalModal) resetStoreFinalModal.style.display = 'none';
            if (resetStoreConfirmationInput) resetStoreConfirmationInput.value = '';
        });
    }

    // =======================================================
    // RESET CASH MODAL EVENT LISTENERS
    // =======================================================
    const confirmResetCashBtn = document.getElementById('confirm-reset-cash');
    if (confirmResetCashBtn) {
        confirmResetCashBtn.addEventListener('click', confirmResetCash);
    }

    const cancelResetCashBtn = document.getElementById('cancel-reset-cash');
    if (cancelResetCashBtn) {
        cancelResetCashBtn.addEventListener('click', () => {
            const resetCashModal = document.getElementById('reset-cash-modal');
            const resetCashConfirmationInput = document.getElementById('reset-cash-confirmation');
            if (resetCashModal) resetCashModal.style.display = 'none';
            if (resetCashConfirmationInput) resetCashConfirmationInput.value = '';
        });
    }

    // =======================================================
    // PAYMENT SUMMARY MODAL EVENT LISTENERS
    // =======================================================
    const closePaymentSummaryBtn = document.querySelector('.close-payment-summary');
    if (closePaymentSummaryBtn) {
        closePaymentSummaryBtn.addEventListener('click', () => {
            const paymentSummaryModal = document.getElementById('payment-summary-modal');
            if (paymentSummaryModal) paymentSummaryModal.style.display = 'none';
        });
    }

    // =======================================================
    // USER MANAGEMENT EVENT LISTENERS
    // =======================================================
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            const notificationDropdown = document.getElementById('notification-dropdown');
            if (notificationDropdown) {
                notificationDropdown.style.display =
                    notificationDropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    }

    const userBtn = document.getElementById('user-btn');
    if (userBtn) {
        userBtn.addEventListener('click', function() {
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) {
                userDropdown.style.display =
                    userDropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    }

    const clearNotificationsBtn = document.getElementById('clear-notifications');
    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', clearAllNotifications);
    }

    const switchUserBtn = document.getElementById('switch-user-btn');
    if (switchUserBtn) {
        switchUserBtn.addEventListener('click', function() {
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) userDropdown.style.display = 'none';
            showLogin();
        });
    }

    const ownerLoginBtn = document.getElementById('owner-login-btn');
    if (ownerLoginBtn) {
        ownerLoginBtn.addEventListener('click', function() {
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) userDropdown.style.display = 'none';
            showLogin();
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) userDropdown.style.display = 'none';
            logout();
        });
    }

    // =======================================================
    // LOGIN MODAL EVENT LISTENERS
    // =======================================================
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const closeLoginModal = document.querySelector('.close-login-modal');
    if (closeLoginModal) {
        closeLoginModal.addEventListener('click', () => {
            const loginModal = document.getElementById('login-modal');
            if (loginModal) loginModal.style.display = 'none';
        });
    }

    // =======================================================
    // RETURNS & REVIEW EVENT LISTENERS
    // =======================================================
    // const returnsBtn = document.getElementById('returns-btn');
    // if (returnsBtn) {
    //     returnsBtn.addEventListener('click', function() {
    //         const returnsModal = document.getElementById('returns-modal');
    //         if (returnsModal) returnsModal.style.display = 'block';
    //     });
    // }
    //
    // const reviewBtn = document.getElementById('review-btn');
    // if (reviewBtn) {
    //     reviewBtn.addEventListener('click', function() {
    //         displayReviewItems();
    //         const reviewModal = document.getElementById('review-modal');
    //         if (reviewModal) reviewModal.style.display = 'block';
    //     });
    // }
    //
    // const closeReturnsModal = document.querySelector('.close-returns-modal');
    // if (closeReturnsModal) {
    //     closeReturnsModal.addEventListener('click', () => {
    //         const returnsModal = document.getElementById('returns-modal');
    //         if (returnsModal) returnsModal.style.display = 'none';
    //     });
    // }
    //
    // const closeReviewModal = document.querySelector('.close-review-modal');
    // if (closeReviewModal) {
    //     closeReviewModal.addEventListener('click', () => {
    //         const reviewModal = document.getElementById('review-modal');
    //         if (reviewModal) reviewModal.style.display = 'none';
    //     });
    // }

    const returnsBtn = document.getElementById('returns-btn');
    if (returnsBtn) {
        returnsBtn.addEventListener('click', function() {
            const returnsModal = document.getElementById('returns-modal');
            if (returnsModal) returnsModal.style.display = 'block';
        });
    }

    const reviewBtn = document.getElementById('review-btn');
    if (reviewBtn) {
        reviewBtn.addEventListener('click', function() {
            displayReviewItems();
            const reviewModal = document.getElementById('review-modal');
            if (reviewModal) reviewModal.style.display = 'block';
        });
    }

    const closeReturnsModal = document.querySelector('.close-returns-modal');
    if (closeReturnsModal) {
        closeReturnsModal.addEventListener('click', () => {
            const returnsModal = document.getElementById('returns-modal');
            if (returnsModal) returnsModal.style.display = 'none';
        });
    }

    const closeReviewModal = document.querySelector('.close-review-modal');
    if (closeReviewModal) {
        closeReviewModal.addEventListener('click', () => {
            const reviewModal = document.getElementById('review-modal');
            if (reviewModal) reviewModal.style.display = 'none';
        });
    }

// ✅ Handle "Initiate Return" form submission
    const returnIniForm = document.getElementById('return-form');
    if (returnIniForm) {
        returnIniForm.addEventListener('submit', function(e) {
            e.preventDefault(); // prevent page reload

            // --- Do your return processing logic here ---
            console.log("Return initiated...");

            // Close modal after processing
            const returnsModal = document.getElementById('returns-modal');
            if (returnsModal) returnsModal.style.display = 'none';

            // Reset form after submission
            returnIniForm.reset();
        });
    }


    // =======================================================
    // RETURN/REPLACEMENT TAB SYSTEM
    // =======================================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.dataset.tab;

            // Remove active class from all tabs
            tabBtns.forEach(tab => tab.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // =======================================================
    // RETURN FORM EVENT LISTENER
    // =======================================================
    const returnForm = document.getElementById('return-form');
    if (returnForm) {
        returnForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const barcode = document.getElementById('return-barcode').value.trim();
            const quantity = document.getElementById('return-quantity').value;
            const reason = document.getElementById('return-reason').value;

            if (barcode && quantity && reason) {
                const success = processReturn(barcode, quantity, reason);
                if (success) {
                    // Show success message
                    const returnInfo = document.getElementById('return-info');
                    if (returnInfo) {
                        returnInfo.style.display = 'block';
                        returnInfo.innerHTML = `
                            <div class="return-success">
                                <h4>Return Initiated Successfully!</h4>
                                <p>The return request has been submitted and is pending review.</p>
                            </div>
                        `;
                    }

                    // Clear form
                    returnForm.reset();

                    // Hide success message after 3 seconds
                    setTimeout(() => {
                        if (returnInfo) returnInfo.style.display = 'none';
                    }, 3000);
                }
            }
        });
    }

    // =======================================================
    // REPLACEMENT FORM EVENT LISTENER
    // =======================================================
    const replacementForm = document.getElementById('replacement-form');
    if (replacementForm) {
        replacementForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const oldBarcode = document.getElementById('old-product-barcode').value.trim();
            const newBarcode = document.getElementById('new-product-barcode').value.trim();
            const quantity = document.getElementById('replacement-quantity').value;

            if (oldBarcode && newBarcode && quantity) {
                const success = processReplacement(oldBarcode, newBarcode, quantity);
                if (success) {
                    // Show success message
                    const replacementInfo = document.getElementById('replacement-info');
                    if (replacementInfo) {
                        replacementInfo.style.display = 'block';
                        replacementInfo.innerHTML = `
                            <div class="return-success">
                                <h4>Replacement Initiated Successfully!</h4>
                                <p>The replacement request has been submitted and is pending review.</p>
                            </div>
                        `;
                    }

                    // Clear form
                    replacementForm.reset();

                    // Hide success message after 3 seconds
                    setTimeout(() => {
                        if (replacementInfo) replacementInfo.style.display = 'none';
                    }, 3000);
                }
            }
        });
    }

    // =======================================================
    // REVIEW FILTER EVENT LISTENERS
    // =======================================================
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;

            // Remove active class from all filter buttons
            filterBtns.forEach(filterBtn => filterBtn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Display filtered items
            displayReviewItems(filter);
        });
    });

    // =======================================================
    // ALL PRODUCTS MODAL EVENT LISTENERS
    // =======================================================
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const allProductsModal = document.getElementById('all-products-modal');
            if (allProductsModal) allProductsModal.style.display = 'none';
        });
    }

    // Modal search functionality
    const modalSearch = document.getElementById('modal-search');
    const modalSort = document.getElementById('modal-sort');

    if (modalSearch) {
        modalSearch.addEventListener('input', showAllProducts);
    }

    if (modalSort) {
        modalSort.addEventListener('change', showAllProducts);
    }

    // =======================================================
    // CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
    // =======================================================
    document.addEventListener('click', function(event) {
        const notificationDropdown = document.getElementById('notification-dropdown');
        const userDropdown = document.getElementById('user-dropdown');

        if (notificationBtn && notificationDropdown &&
            !notificationBtn.contains(event.target) &&
            !notificationDropdown.contains(event.target)) {
            notificationDropdown.style.display = 'none';
        }

        if (userBtn && userDropdown &&
            !userBtn.contains(event.target) &&
            !userDropdown.contains(event.target)) {
            userDropdown.style.display = 'none';
        }
    });

    // =======================================================
    // CLOSE MODALS WHEN CLICKING OUTSIDE
    // =======================================================
    window.addEventListener('click', function(event) {
        const modals = [
            'all-products-modal',
            'returns-modal',
            'review-modal',
            'login-modal',
            'payment-mode-modal',
            'payment-confirmation-modal',
            'reset-store-modal',
            'reset-store-final-modal',
            'reset-cash-modal',
            'payment-summary-modal',
            'settings-modal'
        ];

        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // =======================================================
    // KEYBOARD SHORTCUTS
    // =======================================================
    document.addEventListener('keydown', function(event) {
        // Ctrl+S for quick save
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            saveDataToStorage();
            showMessage('Data saved manually', 'success');
        }

        // Ctrl+Shift+R for reset (admin only)
        if (event.ctrlKey && event.shiftKey && event.key === 'R' && isOwnerLoggedIn) {
            event.preventDefault();
            if (confirm('Reset store data? This cannot be undone.')) {
                resetStore();
            }
        }

        // F1 for help
        if (event.key === 'F1') {
            event.preventDefault();
            showMessage('Keyboard shortcuts: Ctrl+S (Save), Ctrl+Shift+R (Reset - Owner only), F2 (Settings)', 'info');
        }

        // F2 for settings
        if (event.key === 'F2') {
            event.preventDefault();
            showSettings();
        }

        // Escape key to close any open modal
        if (event.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*="display: block"], .modal[style*="display:block"]');
            openModals.forEach(modal => {
                modal.style.display = 'none';
            });

            // Close dropdowns
            const notificationDropdown = document.getElementById('notification-dropdown');
            const userDropdown = document.getElementById('user-dropdown');
            if (notificationDropdown) notificationDropdown.style.display = 'none';
            if (userDropdown) userDropdown.style.display = 'none';
        }
    });

    // =======================================================
    // AUTO-SAVE FUNCTIONALITY
    // =======================================================
    setInterval(() => {
        if (products.length > 0 || salesHistory.length > 0 || returnedItems.length > 0) {
            saveDataToStorage();
        }
    }, 30000); // Auto-save every 30 seconds

    // =======================================================
    // ERROR HANDLING
    // =======================================================
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        showMessage('An unexpected error occurred. Please refresh the page if problems persist.', 'error');
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showMessage('An unexpected error occurred. Please refresh the page if problems persist.', 'error');
    });

    // =======================================================
    // SOUND NOTIFICATIONS (IF ENABLED)
    // =======================================================
    function playNotificationSound() {
        if (shopSettings.soundNotifications) {
            // Create a simple beep sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            } catch (error) {
                console.log('Audio not supported');
            }
        }
    }

    // Override addNotification to include sound
    const originalAddNotification = addNotification;
    addNotification = function(message, type = 'info') {
        originalAddNotification(message, type);
        if (type === 'error' || type === 'warning') {
            playNotificationSound();
        }
    };

    // =======================================================
    // FINAL INITIALIZATION
    // =======================================================

    // Update currency symbols in UI
    function updateCurrencyDisplay() {
        const currencyElements = document.querySelectorAll('.currency-symbol');
        currencyElements.forEach(element => {
            element.textContent = shopSettings.currencySymbol;
        });
    }

    updateCurrencyDisplay();

    // Initialize UI state
    updateDateTime();

    // Show welcome message
    setTimeout(() => {
        showMessage(`Welcome to ${shopSettings.shopName}! System ready.`, 'success');
    }, 1000);

    // Console info
    console.log('='.repeat(50));
    console.log('Shop Management System v2.0');
    console.log('Status: Fully Loaded and Operational');
    console.log('Features: POS, Inventory, Returns, Replacements, Analytics, Settings');
    console.log('User:', currentUser.name, '(' + currentUser.type + ')');
    console.log('Products loaded:', products.length);
    console.log('Sales history:', salesHistory.length);
    console.log('Pending returns/replacements:', returnedItems.filter(item => item.status === 'pending').length);
    console.log('='.repeat(50));
});

// =======================================================
// 17. ADDITIONAL UTILITY FUNCTIONS
// =======================================================

// Add a CSS class for screen reader only content
const style = document.createElement('style');
style.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
`;
document.head.appendChild(style);

// Enhanced data validation
function validateProductData(product) {
    const errors = [];

    if (!product.name || product.name.trim().length < 2) {
        errors.push('Product name must be at least 2 characters long');
    }

    if (!product.singleBarcode || product.singleBarcode.trim().length < 3) {
        errors.push('Single barcode must be at least 3 characters long');
    }

    if (!product.bulkBarcode || product.bulkBarcode.trim().length < 3) {
        errors.push('Bulk barcode must be at least 3 characters long');
    }

    if (product.singlePrice <= 0) {
        errors.push('Single price must be greater than 0');
    }

    if (product.bulkPrice <= 0) {
        errors.push('Bulk price must be greater than 0');
    }

    if (product.bulkQuantity <= 0) {
        errors.push('Bulk quantity must be greater than 0');
    }

    return errors;
}

// Performance monitoring
let performanceMetrics = {
    loadTime: 0,
    lastSaveTime: 0,
    operationCount: 0
};

// Track page load performance
window.addEventListener('load', function() {
    performanceMetrics.loadTime = performance.now();
    console.log(`Page loaded in ${performanceMetrics.loadTime.toFixed(2)}ms`);
});

// Enhanced search with fuzzy matching
function fuzzySearch(query, text) {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    // Exact match
    if (textLower.includes(queryLower)) {
        return true;
    }

    // Fuzzy match (simple implementation)
    let queryIndex = 0;
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
        if (textLower[i] === queryLower[queryIndex]) {
            queryIndex++;
        }
    }

    return queryIndex === queryLower.length;
}

// Final system message
console.log('🚀 Shop Management System Successfully Initialized!');
console.log('💡 All features are now fully operational');
console.log('🔧 Settings, Returns, Replacements, and Stock Management ready');
console.log('📊 Enhanced UI with proper stock status indicators');
console.log('🎯 Notification badges fixed and visible');
