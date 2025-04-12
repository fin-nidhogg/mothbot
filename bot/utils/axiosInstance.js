const axios = require('axios');
const config = require('../config');
const crypto = require('crypto');

/**
 * Creates a pre-configured Axios instance with a base URL and HMAC authentication.
 * This instance is used to send requests to backend services with proper headers and authentication.
 */
const axiosInstance = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Adds a request interceptor to sign the request with an HMAC signature.
 * The signature is generated using the request payload and a secret key.
 * This ensures that all requests are authenticated with the backend services.
 *
 * @param {Object} request - The Axios request object.
 * @param {Object} [request.data] - The request payload (if any).
 * @returns {Object} - The modified request object with the HMAC signature added to the headers.
 */
axiosInstance.interceptors.request.use((request) => {
    // Generate the HMAC signature using the request payload and secret key
    const payload = JSON.stringify(request.data || {});
    const signature = crypto
        .createHmac('sha256', config.botSecret)
        .update(payload)
        .digest('hex');

    request.headers['authorization'] = signature;
    return request;
});

module.exports = axiosInstance;