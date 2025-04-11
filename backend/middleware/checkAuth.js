const crypto = require('crypto');
const SECRET_KEY = process.env.SECRET_KEY;

function verifySignature(req, res, next) {

    const signature = req.headers['authorization'];

    // Check if the signature is present in the request headers
    if (!signature) {
        return res.status(401).send('Auth key missing');
    }

    const payload = JSON.stringify(req.body || {});
    const expectedSignature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(payload)
        .digest('hex');

    // Compare the received signature with the expected signature
    if (signature !== expectedSignature) {
        return res.status(403).send('Auth key mismatch');
    }

    console.log('Backend: Signature verified successfully');
    next(); // Proceed to the next middleware or route handler

}

module.exports = verifySignature;