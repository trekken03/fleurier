const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
}


router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM products WHERE status = ? ORDER BY id ASC',
            ['active']
        );
        return res.json({ success: true, products: rows });
    } catch (err) {
        console.error('Get products error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.get('/all', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY id ASC');
        return res.json({ success: true, products: rows });
    } catch (err) {
        console.error('Get all products error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/', requireAdmin, async (req, res) => {
    const { name, category, price, stock, image, description, status } = req.body;

    if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Name and price are required.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO products (name, category, price, stock, image, description, status, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            [name, category || 'Flowers', price, stock || 0, image || '', description || '', status || 'active']
        );
        const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        return res.json({ success: true, message: 'Product added successfully!', product: rows[0] });
    } catch (err) {
        console.error('Add product error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.put('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, category, price, stock, image, description, status } = req.body;

    try {
        await db.query(
            'UPDATE products SET name=?, category=?, price=?, stock=?, image=?, description=?, status=? WHERE id=?',
            [name, category || 'Flowers', price, stock, image, description, status, id]
        );
        return res.json({ success: true, message: 'Product updated successfully!' });
    } catch (err) {
        console.error('Update product error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.delete('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query('SELECT is_default FROM products WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found.' });


        await db.query('DELETE FROM products WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Product deleted.' });
    } catch (err) {
        console.error('Delete product error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;