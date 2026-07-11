const crypto = require('crypto');
const SECRET_KEY = process.env.SECRET_KEY;

function verifySignature(req, res, next) {
    const signature = req.headers.authorization;
    if (!SECRET_KEY) {
        console.error('Backend: SECRET_KEY is not configured');
        return res.status(500).json({ error: 'API authentication is not configured.' });
    }
    if (!signature) return res.status(401).json({ error: 'Auth key missing.' });
    if (!/^[a-f0-9]{64}$/i.test(signature)) return res.status(403).json({ error: 'Auth key mismatch.' });

    // Body-bearing requests are signed from the exact UTF-8 bytes sent over HTTP.
    // Requests without a body retain the existing "{}" signing convention.
    const payload = req.rawBody?.length ? req.rawBody : JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest();
    const received = Buffer.from(signature, 'hex');

    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
        return res.status(403).json({ error: 'Auth key mismatch.' });
    }
    next();
}

module.exports = verifySignature;
