const mysql = require('mysql2');
require('dotenv').config();

let pool;

if (process.env.MYSQL_URL) {
    // Railway provides a full connection URL
    pool = mysql.createPool(process.env.MYSQL_URL + '?waitForConnections=true&connectionLimit=10&queueLimit=0');
} else {
    // Local development
    pool = mysql.createPool({
        host: process.env.MYSQLHOST || 'localhost',
        user: process.env.MYSQLUSER || 'root',
        password: process.env.MYSQLPASSWORD || '',
        database: process.env.MYSQLDATABASE || 'fleurier_db',
        port: process.env.MYSQLPORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

const promisePool = pool.promise();

promisePool.query('SELECT 1')
    .then(() => console.log('✅ MySQL connected successfully'))
    .catch(err => console.error('❌ Error connecting to MySQL:', err.message));

module.exports = promisePool;