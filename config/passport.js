const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../db');

module.exports = function (passport) {

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                const fullname = profile.displayName;
                const googleId = profile.id;
                const photo = profile.photos[0]?.value || null;

                // Check if user already exists by google_id or email
                const [existing] = await db.query(
                    'SELECT * FROM users WHERE google_id = ? OR email = ?',
                    [googleId, email]
                );

                if (existing.length > 0) {
                    const user = existing[0];

                    // If found by email but no google_id yet, link the account
                    if (!user.google_id) {
                        await db.query(
                            'UPDATE users SET google_id = ?, profile_photo = ? WHERE id = ?',
                            [googleId, photo, user.id]
                        );
                        user.google_id = googleId;
                        user.profile_photo = photo;
                    }

                    return done(null, user);
                }

                // New user — create account
                const [result] = await db.query(
                    'INSERT INTO users (fullname, email, google_id, profile_photo, password, role) VALUES (?, ?, ?, ?, ?, ?)',
                    [fullname, email, googleId, photo, '', 'user']
                );

                const newUser = {
                    id: result.insertId,
                    fullname,
                    email,
                    google_id: googleId,
                    profile_photo: photo,
                    role: 'user'
                };

                return done(null, newUser);

            } catch (err) {
                console.error('Google OAuth error:', err);
                return done(err, null);
            }
        }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const [rows] = await db.query(
                'SELECT id, fullname, email, phone, address, role, google_id, profile_photo FROM users WHERE id = ?',
                [id]
            );
            done(null, rows[0] || null);
        } catch (err) {
            done(err, null);
        }
    });
};