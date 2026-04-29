// Vercel serverless function to handle Tranzila callback
export default function handler(req, res) {
    // Log everything for debugging
    console.log('=== TRANZILA CALLBACK ===');
    console.log('Method:', req.method);
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(req.body));

    // Get data from both query params and body (Tranzila might use either)
    const query = req.query || {};
    const body = req.body || {};

    // Order ID - extract from pdesc (format: "package - ORDER_ID")
    let orderId = body.order_id || query.order_id || query.order || '';

    // If no order_id, try to extract from pdesc
    if (!orderId) {
        const pdesc = body.pdesc || query.pdesc || '';
        if (pdesc && pdesc.includes(' - ')) {
            orderId = pdesc.split(' - ').pop();
        }
    }

    // Tranzila response code - "000" means success
    const responseCode = body.Response || query.Response || '';
    const confirmationCode = body.ConfirmationCode || query.ConfirmationCode || '';
    const index = body.index || query.index || '';

    // Determine payment status
    let paymentStatus = 'pending';

    if (responseCode === '000') {
        paymentStatus = 'success';
    } else if (responseCode && responseCode !== '000') {
        paymentStatus = 'failed';
    }

    console.log('Parsed:', { orderId, responseCode, paymentStatus, confirmationCode });

    // Build redirect URL to main page
    const redirectParams = new URLSearchParams();
    redirectParams.append('payment', paymentStatus);
    if (orderId) redirectParams.append('order', orderId);
    if (confirmationCode) redirectParams.append('confirmation', confirmationCode);
    if (responseCode && responseCode !== '000') redirectParams.append('error', responseCode);

    const redirectUrl = '/?' + redirectParams.toString();

    console.log('Redirecting to:', redirectUrl);

    // Return HTML that breaks out of iframe (if loaded inside one) and
    // redirects the parent window. Falls back to top-level redirect for
    // direct (non-iframe) access. Same-origin so window.top access is allowed.
    const safeUrl = JSON.stringify(redirectUrl);
    const html = `<!DOCTYPE html>
<html lang="he"><head><meta charset="utf-8"><title>מעבד תשלום…</title>
<meta http-equiv="refresh" content="2;url=${redirectUrl}">
<style>body{font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:3rem 1rem;color:#5C5652}</style></head>
<body>
<p>מעבד תשלום…</p>
<script>
(function(){
  var url = ${safeUrl};
  try {
    if (window.top && window.top !== window) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (e) {
    window.location.href = url;
  }
})();
</script>
<noscript><a href="${redirectUrl}">לחץ כאן להמשך</a></noscript>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
}
