const axios = require('axios');
const config = require('../config');
const crypto = require('crypto');

// Create an Axios instance with a base URL
const axiosInstance = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// add a request interceptor to sign the request with a HMAC signature
// This is used to authenticate the request with backend services

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