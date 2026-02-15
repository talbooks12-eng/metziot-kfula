// Vercel serverless function to handle Tranzila POST callback
export default function handler(req, res) {
    // Get payment status and order ID from query or body
    const payment = req.query.payment || req.body?.payment || 'unknown';
    const order = req.query.order || req.body?.order || req.body?.order_id || '';

    // Get Tranzila response data
    const Response = req.body?.Response || req.query.Response || '';
    const ConfirmationCode = req.body?.ConfirmationCode || '';

    // Determine if payment was successful
    let paymentStatus = payment;
    if (Response === '000' || Response === '0') {
        paymentStatus = 'success';
    } else if (Response && Response !== '000') {
        paymentStatus = 'failed';
    }

    // Redirect to main page with payment status
    const redirectUrl = `/?payment=${paymentStatus}&order=${order}&confirmed=${ConfirmationCode ? 'true' : 'false'}`;

    res.redirect(302, redirectUrl);
}
