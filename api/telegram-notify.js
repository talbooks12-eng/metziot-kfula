export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Missing Telegram environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Missing message' });
        }

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('Telegram API error:', data);
            return res.status(500).json({ error: 'Failed to send notification' });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
