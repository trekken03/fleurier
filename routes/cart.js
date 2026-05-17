const express = require('express');
const router = express.Router();
const db = require('../db');

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please log in first.' });
    }
    next();
}

router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const [rows] = await db.query(
            `SELECT c.id, c.quantity, c.selected,
                    p.id AS product_id, p.name, p.price, p.image, p.stock
             FROM cart c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ?
             ORDER BY c.added_at ASC`,
            [userId]
        );
        return res.json({ success: true, cart: rows });
    } catch (err) {
        console.error('Get cart error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.post('/', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
        return res.status(400).json({ success: false, message: 'product_id is required.' });
    }

    try {

        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [product_id]);
        if (!products.length) return res.status(404).json({ success: false, message: 'Product not found.' });
        const product = products[0];
        if (product.stock <= 0) return res.status(400).json({ success: false, message: 'Product is out of stock.' });


        const [existing] = await db.query(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
            [userId, product_id]
        );

        if (existing.length > 0) {
            const newQty = Math.min(existing[0].quantity + quantity, product.stock);
            await db.query('UPDATE cart SET quantity = ? WHERE id = ?', [newQty, existing[0].id]);
        } else {
            await db.query(
                'INSERT INTO cart (user_id, product_id, quantity, selected) VALUES (?, ?, ?, 0)',
                [userId, product_id, Math.min(quantity, product.stock)]
            );
        }

        return res.json({ success: true, message: `${product.name} added to cart!` });
    } catch (err) {
        console.error('Add to cart error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.put('/:id', requireLogin, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;
    const { quantity, selected } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM cart WHERE id = ? AND user_id = ?', [id, userId]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Cart item not found.' });

        const fields = [];
        const values = [];

        if (quantity !== undefined) {

            const [products] = await db.query('SELECT stock FROM products WHERE id = ?', [rows[0].product_id]);
            const stock = products[0]?.stock || 0;
            const safeQty = Math.min(Math.max(1, quantity), stock);
            fields.push('quantity = ?');
            values.push(safeQty);
        }

        if (selected !== undefined) {
            fields.push('selected = ?');
            values.push(selected ? 1 : 0);
        }

        if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update.' });

        values.push(id);
        await db.query(`UPDATE cart SET ${fields.join(', ')} WHERE id = ?`, values);

        return res.json({ success: true, message: 'Cart updated.' });
    } catch (err) {
        console.error('Update cart error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.put('/select/all', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    const { selected } = req.body;

    try {
        await db.query('UPDATE cart SET selected = ? WHERE user_id = ?', [selected ? 1 : 0, userId]);
        return res.json({ success: true, message: 'All items updated.' });
    } catch (err) {
        console.error('Select all error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.delete('/:id', requireLogin, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;

    try {
        await db.query('DELETE FROM cart WHERE id = ? AND user_id = ?', [id, userId]);
        return res.json({ success: true, message: 'Item removed from cart.' });
    } catch (err) {
        console.error('Delete cart item error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.delete('/selected/items', requireLogin, async (req, res) => {
    const userId = req.session.user.id;

    try {
        await db.query('DELETE FROM cart WHERE user_id = ? AND selected = 1', [userId]);
        return res.json({ success: true, message: 'Selected items removed.' });
    } catch (err) {
        console.error('Delete selected error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;