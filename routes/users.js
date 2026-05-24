const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
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


router.get('/me', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, fullname, email, phone, address, role, created_at FROM users WHERE id = ?',
            [req.session.user.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
        return res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error('Get profile error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.put('/me', requireLogin, async (req, res) => {
    const { fullname, email, phone, address } = req.body;

    if (!fullname || !email) {
        return res.status(400).json({ success: false, message: 'Full name and email are required.' });
    }

    try {

        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, req.session.user.id]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'That email is already in use.' });
        }

        await db.query(
            'UPDATE users SET fullname = ?, email = ?, phone = ?, address = ? WHERE id = ?',
            [fullname, email, phone || '', address || '', req.session.user.id]
        );


        req.session.user = { ...req.session.user, fullname, email, phone, address };

        return res.json({ success: true, message: 'Profile updated successfully!', user: req.session.user });
    } catch (err) {
        console.error('Update profile error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.put('/me/password', requireLogin, async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ success: false, message: 'Please fill in all password fields.' });
    }
    if (new_password.length < 8) {
        return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    try {
        const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.session.user.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

        const match = await bcrypt.compare(current_password, rows[0].password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        const hashed = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.session.user.id]);

        return res.json({ success: true, message: 'Password changed successfully!' });
    } catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.get('/', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, fullname, email, phone, address, role, created_at FROM users ORDER BY created_at DESC'
        );
        return res.json({ success: true, users: rows });
    } catch (err) {
        console.error('Get all users error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});



router.put('/:id/role', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role. Must be "user" or "admin".' });
    }

    try {
        const [rows] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        return res.json({ success: true, message: `User role updated to "${role}".` });
    } catch (err) {
        console.error('Change role error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.delete('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query('SELECT id, role FROM users WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
        if (rows[0].role === 'admin') {
            return res.status(403).json({ success: false, message: 'Admin accounts cannot be deleted.' });
        }

        await db.query('DELETE FROM users WHERE id = ?', [id]);
        return res.json({ success: true, message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Delete user error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;