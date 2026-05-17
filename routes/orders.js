const express = require('express');
const router = express.Router();
const db = require('../db');

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please log in first.' });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
}

// POST /api/orders - place an order
router.post('/', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    const {
        items,
        fullname, email, phone, address,
        additional_info, delivery_instructions,
        shipping_method, payment_method,
        subtotal, delivery_fee, total
    } = req.body;

    if (!items || !items.length) {
        return res.status(400).json({ success: false, message: 'No items in your order.' });
    }
    if (!fullname || !phone || !address) {
        return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    const orderCode = 'ORD-' + Date.now();
    try {

        const [orderResult] = await db.query(
            `INSERT INTO orders
             (order_code, user_id, fullname, email, phone, address,
              additional_info, delivery_instructions,
              shipping_method, payment_method,
              subtotal, delivery_fee, total, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
            [
                orderCode, userId, fullname, email, phone, address,
                additional_info || '', delivery_instructions || '',
                shipping_method || 'standard', payment_method || 'cod',
                subtotal, delivery_fee, total
            ]
        );

        const orderId = orderResult.insertId;


        for (const item of items) {
            await db.query(
                'INSERT INTO order_items (order_id, product_id, name, price, quantity, image) VALUES (?, ?, ?, ?, ?, ?)',
                [orderId, item.product_id || null, item.name, item.price, item.quantity, item.image || '']
            );


            if (item.product_id) {
                await db.query(
                    'UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }


            await db.query(
                'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
                [userId, item.product_id]
            );
        }

        return res.json({ success: true, message: `Order placed! Order ID: ${orderCode}`, orderId: orderCode });

    } catch (err) {
        console.error('Place order error:', err);
        return res.status(500).json({ success: false, message: 'Server error placing order.' });
    }
});


router.get('/my', requireLogin, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        for (const order of orders) {
            const [items] = await db.query(
                'SELECT * FROM order_items WHERE order_id = ?',
                [order.id]
            );
            order.items = items;
        }

        return res.json({ success: true, orders });
    } catch (err) {
        console.error('Get my orders error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.get('/', requireAdmin, async (req, res) => {
    try {
        const [orders] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');

        for (const order of orders) {
            const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
            order.items = items;
        }

        return res.json({ success: true, orders });
    } catch (err) {
        console.error('Get all orders error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.put('/:id/status', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    try {
        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
        if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found.' });

        const order = orders[0];
        const oldStatus = order.status;

        await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);


        if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
            const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
            for (const item of items) {
                if (item.product_id) {
                    await db.query(
                        'UPDATE products SET stock = stock + ? WHERE id = ?',
                        [item.quantity, item.product_id]
                    );
                }
            }
        }

        return res.json({ success: true, message: 'Order status updated!' });
    } catch (err) {
        console.error('Update order status error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;