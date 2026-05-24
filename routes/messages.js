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


router.post('/', requireLogin, async (req, res) => {
    const { name, email, message } = req.body;
    const userId = req.session.user.id;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    try {
        await db.query(
            'INSERT INTO contact_messages (user_id, name, email, message) VALUES (?, ?, ?, ?)',
            [userId, name, email, message]
        );
        return res.json({ success: true, message: "Message sent! We'll get back to you soon." });
    } catch (err) {
        console.error('Send message error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.get('/', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM contact_messages ORDER BY created_at DESC'
        );
        return res.json({ success: true, messages: rows });
    } catch (err) {
        console.error('Get messages error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.put('/:id/reply', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
        return res.status(400).json({ success: false, message: 'Reply cannot be empty.' });
    }

    try {
        const [rows] = await db.query('SELECT id FROM contact_messages WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Message not found.' });

        await db.query(
            'UPDATE contact_messages SET reply = ?, replied_at = NOW() WHERE id = ?',
            [reply.trim(), id]
        );
        return res.json({ success: true, message: 'Reply sent successfully!' });
    } catch (err) {
        console.error('Reply message error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.get('/my', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const [rows] = await db.query(
            'SELECT * FROM contact_messages WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return res.json({ success: true, messages: rows });
    } catch (err) {
        console.error('Get my messages error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.delete('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM contact_messages WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Message deleted.' });
    } catch (err) {
        console.error('Delete message error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;