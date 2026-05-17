const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

promisePool.query('SELECT 1')
    .then(() => console.log('✅ MySQL connected successfully'))
    .catch(err => console.error('❌ Error connecting to MySQL:', err.message));

module.exports = promisePool;