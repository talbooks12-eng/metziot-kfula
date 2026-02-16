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

    // Build data object for postMessage
    const paymentData = {
        status: paymentStatus,
        order: order,
        confirmation: confirmationCode,
        index: index
    };

    // Return HTML page that sends postMessage to parent and redirects
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
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
    </style>
</head>
<body>
    <div class="message">
        <div class="spinner"></div>
        <p>מעבד את התשלום...</p>
    </div>
    <script>
        // Send message to parent window (for iframe integration)
        const paymentData = ${JSON.stringify(paymentData)};

        if (window.parent && window.parent !== window) {
            // We're in an iframe - send postMessage to parent
            window.parent.postMessage({
                type: 'tranzila-payment',
                data: paymentData
            }, '*');
        } else {
            // Not in iframe - redirect normally
            const params = new URLSearchParams();
            params.append('payment', paymentData.status);
            if (paymentData.order) params.append('order', paymentData.order);
            if (paymentData.confirmation) params.append('confirmation', paymentData.confirmation);
            window.location.href = '/?' + params.toString();
        }
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
