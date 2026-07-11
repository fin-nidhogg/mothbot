const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: envFile });
const mongoose = require('mongoose');

const requiredDatabaseVariables = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_AUTH_MECHANISM', 'DB_AUTH_SOURCE', 'DB_USER', 'DB_PWD'];
if (process.env.NODE_ENV === 'production') {
    const missing = requiredDatabaseVariables.filter(key => !process.env[key]);
    if (missing.length) throw new Error(`Missing production database configuration: ${missing.join(', ')}`);
}

mongoose.set('strictQuery', true);

const user = encodeURIComponent(process.env.DB_USER || '');
const password = encodeURIComponent(process.env.DB_PWD || '');
const database = encodeURIComponent(process.env.DB_NAME || '');
const authMechanism = encodeURIComponent(process.env.DB_AUTH_MECHANISM || 'SCRAM-SHA-256');
const authSource = encodeURIComponent(process.env.DB_AUTH_SOURCE || 'admin');
const uri = `mongodb://${user}:${password}@${process.env.DB_HOST}:${process.env.DB_PORT}/${database}?authMechanism=${authMechanism}&authSource=${authSource}`;

mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
const db = mongoose.connection;
db.on('error', error => console.error('Error while connecting to MongoDB:', error));
db.once('open', () => {
    console.log('Connected to MongoDB, using database:', db.name);
    if (!require.main?.filename.endsWith('server.js')) return;
    const AdminUser = require('./models/AdminUser');
    AdminUser.exists({ active: true })
        .then(user => { if (!user) console.warn('WARNING: No active admin user exists. Run npm run admin:create with the appropriate environment.'); })
        .catch(error => console.error('Could not check admin user availability:', error));
});
db.on('disconnected', () => console.log('Disconnected from MongoDB'));

module.exports = db;
