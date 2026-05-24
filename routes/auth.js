const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sendVerificationEmail } = require('../config/mailer');
const router = express.Router();


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


        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const [result] = await db.query(
            'INSERT INTO users (fullname, email, phone, address, password, role, is_verified, verification_code, code_expires_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
            [fullname, email, phone || '', address || '', hashed, 'user', code, expiresAt]
        );


        try {
            await sendVerificationEmail(email, fullname, code);
        } catch (mailErr) {
            console.error('Email send error:', mailErr.message);

        }


        req.session.pendingVerification = { userId: result.insertId, email, fullname };

        return res.json({ success: true, message: 'Account created! Please check your email for the verification code.', email });

    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});


router.post('/verify-email', async (req, res) => {
    const { code } = req.body;
    const pending = req.session.pendingVerification;

    if (!pending) {
        return res.status(400).json({ success: false, message: 'No verification pending. Please register again.' });
    }
    if (!code) {
        return res.status(400).json({ success: false, message: 'Please enter the verification code.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE id = ? AND verification_code = ?',
            [pending.userId, code.trim()]
        );

        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'Invalid verification code. Please try again.' });
        }

        const user = rows[0];

        // Check expiry
        if (new Date() > new Date(user.code_expires_at)) {
            return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
        }


        await db.query(
            'UPDATE users SET is_verified = 1, verification_code = NULL, code_expires_at = NULL WHERE id = ?',
            [user.id]
        );


        req.session.pendingVerification = null;

        return res.json({ success: true, message: 'Email verified successfully! You can now log in.' });

    } catch (err) {
        console.error('Verify email error:', err);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});


router.post('/resend-code', async (req, res) => {
    const pending = req.session.pendingVerification;

    if (!pending) {
        return res.status(400).json({ success: false, message: 'No verification pending.' });
    }

    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await db.query(
            'UPDATE users SET verification_code = ?, code_expires_at = ? WHERE id = ?',
            [code, expiresAt, pending.userId]
        );

        await sendVerificationEmail(pending.email, pending.fullname, code);

        return res.json({ success: true, message: 'A new code has been sent to your email.' });

    } catch (err) {
        console.error('Resend code error:', err);
        return res.status(500).json({ success: false, message: 'Failed to resend code.' });
    }
});


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


        if (!user.is_verified) {

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            await db.query(
                'UPDATE users SET verification_code = ?, code_expires_at = ? WHERE id = ?',
                [code, expiresAt, user.id]
            );
            try { await sendVerificationEmail(user.email, user.fullname, code); } catch (e) { }
            req.session.pendingVerification = { userId: user.id, email: user.email, fullname: user.fullname };
            return res.status(403).json({ success: false, message: 'Please verify your email first.', unverified: true });
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


router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false, message: 'Logout failed.' });
        res.clearCookie('connect.sid');
        return res.json({ success: true, message: 'Logged out successfully.' });
    });
});


router.get('/me', (req, res) => {
    if (req.session.user) {
        return res.json({ success: true, user: req.session.user });
    }
    return res.json({ success: false, user: null });
});


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

        return res.json({ success: true, message: `Reset link sent! Check your email (${email}).` });

    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

module.exports = router;


const passport = require('passport');


router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html?error=google' }),
    async (req, res) => {
        try {
            const user = req.user;


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