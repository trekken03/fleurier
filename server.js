require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------
// MySQL session store
// -------------------------------------------------------
const sessionStoreOptions = {
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    createDatabaseTable: true
};
const sessionStore = new MySQLStore(sessionStoreOptions);

// -------------------------------------------------------
// Middleware
// -------------------------------------------------------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    key: 'fleurier_session',
    secret: process.env.SESSION_SECRET || 'fleurier_secret_key_2025',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// -------------------------------------------------------
// Passport Google Strategy
// -------------------------------------------------------
require('./config/passport')(passport);

// -------------------------------------------------------
// Static files
// -------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------
// API Routes
// -------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

// -------------------------------------------------------
// Fallback
// -------------------------------------------------------
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log("MYSQLHOST:", process.env.MYSQLHOST);
console.log("PORT:", process.env.PORT);

app.listen(PORT, () => {
    console.log(`🌸 Fleurier server running at http://localhost:${PORT}`);
});