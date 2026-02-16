// Vercel serverless function to get Tranzila handshake token
export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const { sum, orderId, currency = '1' } = req.body;

        if (!sum) {
            return res.status(400).json({ error: 'Missing sum parameter' });
        }

        // Tranzila credentials
        const TERMINAL = 'fxptbooks3601';
        const PASSWORD = 'HThjvyeO';

        console.log('=== TRANZILA HANDSHAKE ===');
        console.log('Sum:', sum);
        console.log('Order ID:', orderId);

        // Build handshake parameters
        const params = new URLSearchParams();
        params.append('supplier', TERMINAL);
        params.append('TranzilaPW', PASSWORD);
        params.append('sum', sum);
        params.append('currency', currency);
        params.append('op', '1'); // Operation type for handshake

        // Call Tranzila handshake API
        const response = await fetch('https://secure5.tranzila.com/cgi-bin/tranzila71dt.cgi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });

        const responseText = await response.text();
        console.log('Tranzila handshake response:', responseText);

        // Parse response - Tranzila returns key=value pairs
        const responseParams = new URLSearchParams(responseText);
        const thtk = responseParams.get('thtk') || responseParams.get('THTK');
        const responseCode = responseParams.get('Response');

        if (thtk) {
            console.log('Got thtk token:', thtk);

            // Build iframe URL with the token
            const iframeParams = new URLSearchParams();
            iframeParams.append('sum', sum);
            iframeParams.append('currency', currency);
            iframeParams.append('thtk', thtk);
            iframeParams.append('cred_type', '1');
            iframeParams.append('tranmode', 'A');
            iframeParams.append('maxpay', '1');
            if (orderId) iframeParams.append('order_id', orderId);

            const iframeUrl = `https://direct.tranzila.com/${TERMINAL}/iframenew.php?${iframeParams.toString()}`;

            return res.status(200).json({
                success: true,
                thtk: thtk,
                iframeUrl: iframeUrl
            });
        } else {
            console.error('No thtk in response. Response code:', responseCode);
            return res.status(400).json({
                success: false,
                error: 'Failed to get handshake token',
                responseCode: responseCode,
                rawResponse: responseText
            });
        }

    } catch (error) {
        console.error('Handshake error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
