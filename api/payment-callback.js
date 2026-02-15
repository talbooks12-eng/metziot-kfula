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

    // Build redirect URL
    const params = new URLSearchParams();
    params.append('payment', paymentStatus);
    if (order) params.append('order', order);
    if (confirmationCode) params.append('confirmation', confirmationCode);
    if (index) params.append('index', index);

    const redirectUrl = '/?' + params.toString();

    console.log('Redirecting to:', redirectUrl);

    // Redirect to main page with payment status
    res.redirect(302, redirectUrl);
}
