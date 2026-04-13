const https = require('https');

module.exports = function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Missing Telegram environment variables. TOKEN exists:', !!TELEGRAM_BOT_TOKEN, 'CHAT_ID exists:', !!TELEGRAM_CHAT_ID);
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const { message } = req.body || {};

    if (!message) {
        return res.status(400).json({ error: 'Missing message' });
    }

    const postData = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    });

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (parsed.ok) {
                    return res.status(200).json({ success: true });
                } else {
                    console.error('Telegram API error:', parsed);
                    return res.status(500).json({ error: 'Failed to send notification' });
                }
            } catch (e) {
                console.error('Parse error:', e);
                return res.status(500).json({ error: 'Internal server error' });
            }
        });
    });

    request.on('error', (error) => {
        console.error('Request error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    });

    request.write(postData);
    request.end();
};
