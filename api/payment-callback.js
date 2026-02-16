// Vercel serverless function to handle Tranzila callback
export default function handler(req, res) {
    // Log everything for debugging
    console.log('=== TRANZILA CALLBACK ===');
    console.log('Method:', req.method);
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(req.body));
    console.log('Headers:', JSON.stringify(req.headers));

    // Get data from both query params and body (Tranzila might use either)
    const query = req.query || {};
    const body = req.body || {};

    // Order ID - Tranzila returns it as order_id
    const orderId = body.order_id || query.order_id || query.order || '';

    // Tranzila response code - "000" means success
    const responseCode = body.Response || query.Response || '';
    const confirmationCode = body.ConfirmationCode || query.ConfirmationCode || '';
    const index = body.index || query.index || '';
    const ccno = body.ccno || ''; // Last 4 digits of card

    // Determine payment status
    let paymentStatus = 'unknown';

    if (responseCode === '000') {
        paymentStatus = 'success';
    } else if (responseCode && responseCode !== '000') {
        paymentStatus = 'failed';
    } else if (query.payment) {
        // Fallback to our own parameter if set
        paymentStatus = query.payment;
    }

    console.log('Parsed data:', { orderId, responseCode, paymentStatus, confirmationCode });

    // Build redirect URL
    const redirectParams = new URLSearchParams();
    redirectParams.append('payment', paymentStatus);
    if (orderId) redirectParams.append('order', orderId);
    if (confirmationCode) redirectParams.append('confirmation', confirmationCode);
    if (responseCode) redirectParams.append('response', responseCode);

    const redirectUrl = '/?' + redirectParams.toString();

    // Payment data for postMessage
    const paymentData = {
        status: paymentStatus,
        order: orderId,
        confirmation: confirmationCode,
        response: responseCode,
        index: index,
        lastFour: ccno
    };

    // Return HTML that notifies parent and redirects
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מעבד תשלום...</title>
    <style>
        body {
            font-family: 'Heebo', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
            direction: rtl;
            text-align: center;
        }
        .message {
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 90%;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #8B7355;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .success { color: #4CAF50; font-size: 2rem; }
        .failed { color: #f44336; font-size: 2rem; }
        .debug { font-size: 0.7rem; color: #999; margin-top: 1rem; word-break: break-all; }
    </style>
</head>
<body>
    <div class="message">
        <div id="icon" class="spinner"></div>
        <p id="statusText">מעבד את התשלום...</p>
        <div class="debug">Order: ${orderId} | Response: ${responseCode}</div>
    </div>
    <script>
        const paymentData = ${JSON.stringify(paymentData)};
        const redirectUrl = '${redirectUrl}';

        // Update UI based on status
        const icon = document.getElementById('icon');
        const statusText = document.getElementById('statusText');

        if (paymentData.status === 'success') {
            icon.className = 'success';
            icon.textContent = '✓';
            statusText.textContent = 'התשלום התקבל בהצלחה! מעביר אותך...';
        } else if (paymentData.status === 'failed') {
            icon.className = 'failed';
            icon.textContent = '✗';
            statusText.textContent = 'התשלום נכשל. מעביר אותך...';
        }

        // Try postMessage to parent (for iframe)
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'tranzila-payment',
                    data: paymentData
                }, '*');
                console.log('postMessage sent');
            }
        } catch (e) {
            console.log('postMessage error:', e);
        }

        // Redirect after delay
        setTimeout(function() {
            window.top.location.href = redirectUrl;
        }, 2000);
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
