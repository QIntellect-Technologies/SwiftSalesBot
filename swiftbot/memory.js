
// In-memory session store
const sessions = new Map();

function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, {
            userId,
            history: [],
            cart: [],
            cart_total: 0,
            current_step: 'greeting',
            last_category: null,
            last_page: 1,
            delivery_address: null
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

    // Keep only last 10 messages
    if (session.history.length > 10) {
        session.history.shift();
    }

    sessions.set(userId, session);
}

function clearCart(userId) {
    updateSession(userId, { cart: [], cart_total: 0 });
}

function removeFromCart(userId, productId) {
    const session = getSession(userId);
    const updatedCart = session.cart.filter(item => item.product_id != productId);
    updateSession(userId, { cart: updatedCart });
}

module.exports = { getSession, updateSession, addToHistory, clearCart, removeFromCart };
