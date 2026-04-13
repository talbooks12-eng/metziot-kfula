const https = require('https');

const TELEGRAM_BOT_TOKEN = '8587921062:AAERSCVZe1tDt4FKIss6exrYrriMDVLJA1c';
const TELEGRAM_CHAT_ID = '6573456373';

module.exports = function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse body - handle both string and object
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    const message = body.message;

    if (!message) {
        return res.status(400).json({ error: 'Missing message', receivedBody: typeof req.body, keys: Object.keys(body) });
    }

    const postData = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    });

    const options = {
        hostname: 'api.telegram.org',
        path: '/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const request = https.request(options, function(response) {
        let data = '';
        response.on('data', function(chunk) { data += chunk; });
        response.on('end', function() {
            try {
                const parsed = JSON.parse(data);
                if (parsed.ok) {
                    return res.status(200).json({ success: true });
                } else {
                    return res.status(500).json({ error: 'Telegram error', details: parsed });
                }
            } catch (e) {
                return res.status(500).json({ error: 'Parse error' });
            }
        });
    });

    request.on('error', function(error) {
        return res.status(500).json({ error: 'Request error', details: error.message });
    });

    request.write(postData);
    request.end();
};
