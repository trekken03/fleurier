const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { fullname, email, phone, address, password } = req.body;

    if (!fullname || !email || !password) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (fullname, email, phone, address, password, role) VALUES (?, ?, ?, ?, ?, ?)',
            [fullname, email, phone || '', address || '', hashed, 'user']
        );

        const newUser = { id: result.insertId, fullname, email, phone, address, role: 'user' };


        return res.json({ success: true, message: `Welcome, ${fullname}!`, user: newUser });

    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    try {
        // Admin hardcoded check (matches your original logic)
        if (email === 'admin@fleurier.com' && password === 'admin123') {
            const [admins] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
            let adminUser;

            if (admins.length > 0) {
                adminUser = admins[0];
            } else {
                // Create admin if not in DB yet
                const hashed = await bcrypt.hash('admin123', 10);
                const [result] = await db.query(
                    'INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)',
                    ['Admin', email, hashed, 'admin']
                );
                adminUser = { id: result.insertId, fullname: 'Admin', email, role: 'admin' };
            }

            req.session.user = { id: adminUser.id, fullname: adminUser.fullname, email: adminUser.email, role: 'admin' };
            return res.json({ success: true, message: 'Welcome, Admin!', user: req.session.user });
        }

        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password. Please try again.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid email or password. Please try again.' });
        }

        req.session.user = {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            address: user.address,
            role: user.role
        };

        return res.json({ success: true, message: `Welcome back, ${user.fullname}!`, user: req.session.user });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false, message: 'Logout failed.' });
        res.clearCookie('connect.sid');
        return res.json({ success: true, message: 'Logged out successfully.' });
    });
});

// GET /api/auth/me - check current session
router.get('/me', (req, res) => {
    if (req.session.user) {
        return res.json({ success: true, user: req.session.user });
    }
    return res.json({ success: false, user: null });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Please enter your email address.' });
    }

    try {
        const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No account found with that email address.' });
        }

        // In a real app you'd send an email here
        // For now we simulate the same behavior as your original frontend
        return res.json({ success: true, message: `Reset link sent! Check your email (${email}).` });

    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

module.exports = router;

// -------------------------------------------------------
// Google OAuth Routes
// -------------------------------------------------------
const passport = require('passport');

// GET /api/auth/google - redirect to Google login
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// GET /api/auth/google/callback - Google redirects here
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html?error=google' }),
    async (req, res) => {
        try {
            const user = req.user;

            // Set our custom session
            req.session.user = {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                phone: user.phone || '',
                address: user.address || '',
                role: user.role || 'user',
                profile_photo: user.profile_photo || null,
                google_id: user.google_id || null
            };

            // Redirect based on role
            if (user.role === 'admin') {
                return res.redirect('/admin_dashb.html');
            }
            return res.redirect('/index.html');

        } catch (err) {
            console.error('Google callback error:', err);
            return res.redirect('/login.html?error=google');
        }
    }
);