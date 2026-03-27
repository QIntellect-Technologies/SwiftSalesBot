// In-memory session store with order history
const sessions = new Map();

function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, {
            userId,
            history: [],           // Chat history (last 20 messages)
            cart: [],              // Current cart
            cart_total: 0,        
            current_step: 'greeting',
            customer_name: null,   // Remembered across sessions
            customer_phone: userId, // Default to WhatsApp number
            delivery_address: null, // Remembered for next order
            order_history: [],     // All past orders [{order_id, items, total, date}]
            order_count: 0,        // Total orders placed
        });
    }
    return sessions.get(userId);
}

function updateSession(userId, updates) {
    const session = getSession(userId);
    const updatedSession = { ...session, ...updates };

    // Recalculate total if cart was updated
    if (updates.cart) {
        updatedSession.cart_total = updatedSession.cart.reduce((total, item) => total + (item.subtotal || 0), 0);
    }

    sessions.set(userId, updatedSession);
    return updatedSession;
}

function addToHistory(userId, role, content) {
    const session = getSession(userId);
    session.history.push({ role, content });

    // Keep only last 20 messages for richer context
    if (session.history.length > 20) {
        session.history.shift();
    }

    sessions.set(userId, session);
}

function addOrderToHistory(userId, orderDetails) {
    const session = getSession(userId);
    session.order_history.push({
        ...orderDetails,
        date: new Date().toISOString()
    });
    session.order_count = (session.order_count || 0) + 1;
    // Keep only last 10 orders in memory
    if (session.order_history.length > 10) {
        session.order_history.shift();
    }
    sessions.set(userId, session);
}

function clearCart(userId) {
    updateSession(userId, { cart: [], cart_total: 0 });
}

module.exports = { getSession, updateSession, addToHistory, addOrderToHistory, clearCart };
