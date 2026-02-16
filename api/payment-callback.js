// Vercel serverless function to handle Tranzila POST callback
export default function handler(req, res) {
    // Log the incoming request for debugging
    console.log('Payment callback received:', {
        method: req.method,
        query: req.query,
        body: req.body
    });

    // Get order ID from query params (we set this when creating the URL)
    const order = req.query.order || req.body?.order_id || '';

    // Get Tranzila response data from POST body
    const tranzilaResponse = req.body?.Response || '';
    const confirmationCode = req.body?.ConfirmationCode || '';
    const index = req.body?.index || '';

    // Determine payment status
    // Tranzila Response "000" = success, anything else = failure
    // Also check the URL path - success_url gets payment=success, fail_url gets payment=failed
    let paymentStatus = req.query.payment || 'unknown';

    // Override with Tranzila's actual response if available
    if (tranzilaResponse === '000') {
        paymentStatus = 'success';
    } else if (tranzilaResponse && tranzilaResponse !== '000' && tranzilaResponse !== '') {
        paymentStatus = 'failed';
    }

    // Build redirect URL params
    const redirectParams = new URLSearchParams();
    redirectParams.append('payment', paymentStatus);
    if (order) redirectParams.append('order', order);
    if (confirmationCode) redirectParams.append('confirmation', confirmationCode);

    const redirectUrl = '/?' + redirectParams.toString();

    // Build data object for postMessage
    const paymentData = {
        status: paymentStatus,
        order: order,
        confirmation: confirmationCode,
        index: index
    };

    // Return HTML page that tries postMessage first, then redirects as fallback
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
        }
        .message {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
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
        .status-success { color: #4CAF50; }
        .status-failed { color: #f44336; }
    </style>
</head>
<body>
    <div class="message">
        <div class="spinner"></div>
        <p id="statusText">מעבד את התשלום...</p>
    </div>
    <script>
        const paymentData = ${JSON.stringify(paymentData)};
        const redirectUrl = '${redirectUrl}';
        let messageSent = false;

        // Update status text based on payment result
        const statusText = document.getElementById('statusText');
        if (paymentData.status === 'success') {
            statusText.innerHTML = '<span class="status-success">✓</span> התשלום התקבל! מעביר אותך...';
        } else if (paymentData.status === 'failed') {
            statusText.innerHTML = '<span class="status-failed">✗</span> התשלום נכשל. מעביר אותך...';
        }

        // Try to send postMessage to parent (works if we're in iframe)
        function sendToParent() {
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'tranzila-payment',
                        data: paymentData
                    }, '*');
                    messageSent = true;
                    console.log('postMessage sent to parent');
                }
            } catch (e) {
                console.log('postMessage failed:', e);
            }
        }

        // Send message immediately
        sendToParent();

        // Also redirect after a short delay as fallback
        // This handles cases where:
        // 1. We're not in an iframe (Tranzila broke out)
        // 2. postMessage was blocked
        // 3. Parent didn't receive the message
        setTimeout(function() {
            // Always redirect - the main page will handle duplicate events
            window.top.location.href = redirectUrl;
        }, 1500);
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
