// Send a thank-you / order-confirmation email to the customer.
// Triggered from the frontend after a successful Tranzila payment.
// Uses Brevo (https://brevo.com) — env var BREVO_API_KEY required.
//
// The email body is plain Hebrew text. The subject and main paragraph
// fork on delivery method:
//   - איסוף עצמי: ask the customer to call/WhatsApp to coordinate pickup
//   - משלוח:      confirm address + 3-5 day ETA

export default async function handler(req, res) {
    // Basic CORS for same-origin POST. Vercel routes are same-origin
    // by default, so this is mostly defensive.
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(204).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        console.error('BREVO_API_KEY not set');
        return res.status(500).json({ error: 'Email service not configured' });
    }

    const order = req.body || {};
    const required = ['email', 'name', 'orderId', 'package', 'totalAmount', 'deliveryMethod'];
    for (const key of required) {
        if (!order[key]) return res.status(400).json({ error: 'Missing field: ' + key });
    }

    const isPickup = order.deliveryMethod === 'איסוף עצמי';
    const subject = isPickup
        ? 'תודה על הרכישה! פרטי איסוף עצמי 📖'
        : 'תודה על הרכישה! הספר בדרך אליך 📖';

    const deliveryBlock = isPickup
        ? [
            '📍 איסוף עצמי — חשוב!',
            'האיסוף מתבצע בתיאום מראש בלבד.',
            'אנא יצרי/צור איתי קשר לפני שאתה מגיע, כדי שנתאם מקום ושעה.',
            '',
            '🗓️ אזור: השרון / מרכז הארץ',
            '🕐 שעות תיאום אפשריות: ימים א׳-ה׳, 18:00–20:00',
            '',
            '📱 וואטסאפ או טלפון לתיאום: 054-325-7663',
            '(אני אחזור אליך בהקדם)',
          ].join('\n')
        : [
            '📦 פרטי משלוח:',
            'הספר יישלח לכתובת: ' + (order.address || ''),
            'המשלוח יגיע אליך תוך 3-5 ימי עסקים.',
            'אם נצטרך לעדכן פרטים — נצור איתך קשר.',
          ].join('\n');

    const text = [
        'אהלן ' + order.name + '! 😊',
        '',
        'תודה שרכשת את הספר הראשון שלי ״מציאות כפולה״!',
        'מתרגש שאת/ה חלק מהסיפור שלי ותמכת גם בפרויקט שפת הים, שהוא חשוב מאוד עבורי.',
        '',
        'ההזמנה התקבלה בהצלחה ✅',
        '',
        'פרטי ההזמנה:',
        '━━━━━━━━━━━━━━━━━━',
        'מספר הזמנה: ' + order.orderId,
        'חבילה: ' + order.package,
        'סכום ששולם: ₪' + order.totalAmount,
        (order.dedication ? 'הקדשה: ' + order.dedication : ''),
        '━━━━━━━━━━━━━━━━━━',
        '',
        deliveryBlock,
        '',
        '📄 קבלה / חשבונית: הקבלה הירוקה תגיע אליך בנפרד ישירות מטרנזילה למייל הזה.',
        '',
        'לשאלות ובירורים:',
        '📱 טלפון: 054-325-7663',
        '📧 אימייל: Talbooks12@gmail.com',
        '',
        'אשמח לשמוע מה חשבת על הספר, ומוזמן/ת לשתף ברשתות החברתיות ולתייג אותי 🤍',
        '',
        'תודה שוב,',
        'טל',
    ].filter(Boolean).join('\n');

    const html =
        '<div dir="rtl" style="font-family:system-ui,-apple-system,Segoe UI,Rubik,Arial,sans-serif;font-size:15px;line-height:1.7;color:#2D2926;max-width:560px;margin:0 auto;padding:24px;background:#FAF7F2;">' +
            '<h1 style="font-size:22px;margin:0 0 8px 0;color:#1B5E20;">אהלן ' + escapeHtml(order.name) + '! 😊</h1>' +
            '<p style="margin:0 0 16px 0;">תודה שרכשת את הספר הראשון שלי <strong>״מציאות כפולה״</strong>!</p>' +
            '<p style="margin:0 0 16px 0;">מתרגש שאת/ה חלק מהסיפור שלי ותמכת גם ב<strong>פרויקט שפת הים</strong>, שהוא חשוב מאוד עבורי.</p>' +
            '<p style="margin:0 0 18px 0;font-weight:700;color:#1B5E20;">ההזמנה התקבלה בהצלחה ✅</p>' +
            '<div style="background:#fff;border:1px solid #E5DDD0;border-radius:10px;padding:16px;margin:0 0 18px 0;">' +
                '<div style="font-weight:700;color:#6B5744;margin-bottom:8px;">פרטי ההזמנה</div>' +
                '<div>מספר הזמנה: <strong>' + escapeHtml(order.orderId) + '</strong></div>' +
                '<div>חבילה: <strong>' + escapeHtml(order.package) + '</strong></div>' +
                '<div>סכום ששולם: <strong>₪' + escapeHtml(String(order.totalAmount)) + '</strong></div>' +
                (order.dedication ? '<div>הקדשה: <strong>' + escapeHtml(order.dedication) + '</strong></div>' : '') +
            '</div>' +
            '<div style="background:#fff;border-right:4px solid #2E7D32;padding:14px 16px;border-radius:6px;margin:0 0 18px 0;">' +
                (isPickup
                    ? '<div style="font-weight:800;color:#1B5E20;margin-bottom:8px;font-size:16px;">📍 איסוף עצמי — חשוב!</div>' +
                      '<p style="margin:0 0 10px 0;font-weight:700;">האיסוף מתבצע בתיאום מראש בלבד.</p>' +
                      '<p style="margin:0 0 12px 0;">אנא <strong>יצרי/צור איתי קשר לפני שאתה מגיע</strong>, כדי שנתאם מקום ושעה.</p>' +
                      '<p style="margin:0 0 4px 0;">🗓️ אזור: השרון / מרכז הארץ</p>' +
                      '<p style="margin:0 0 10px 0;">🕐 שעות תיאום אפשריות: ימים א׳-ה׳, 18:00–20:00</p>' +
                      '<p style="margin:0;font-size:16px;">📱 וואטסאפ/טלפון לתיאום: <a href="tel:054-3257663" style="color:#1B5E20;font-weight:800;text-decoration:none;">054-325-7663</a></p>' +
                      '<p style="margin:6px 0 0 0;font-size:13px;color:#6B5744;">(אני אחזור אליך בהקדם)</p>'
                    : '<div style="font-weight:800;color:#1B5E20;margin-bottom:6px;">📦 משלוח עד הבית</div>' +
                      '<p style="margin:0 0 8px 0;">הספר יישלח לכתובת: <strong>' + escapeHtml(order.address || '') + '</strong></p>' +
                      '<p style="margin:0;">המשלוח יגיע אליך תוך <strong>3-5 ימי עסקים</strong>. אם נצטרך לעדכן פרטים — נצור איתך קשר.</p>') +
            '</div>' +
            '<p style="margin:0 0 14px 0;padding:10px 12px;background:#F5F1E8;border-radius:6px;font-size:13.5px;color:#5C5652;">📄 <strong>קבלה / חשבונית:</strong> הקבלה הירוקה תגיע אליך בנפרד ישירות מטרנזילה למייל הזה.</p>' +
            '<p style="margin:0 0 6px 0;font-weight:700;color:#6B5744;">לשאלות ובירורים:</p>' +
            '<p style="margin:0 0 4px 0;">📱 <a href="tel:054-3257663" style="color:#1B5E20;text-decoration:none;">054-325-7663</a></p>' +
            '<p style="margin:0 0 18px 0;">📧 <a href="mailto:Talbooks12@gmail.com" style="color:#1B5E20;text-decoration:none;">Talbooks12@gmail.com</a></p>' +
            '<p style="margin:0 0 6px 0;">אשמח לשמוע מה חשבת על הספר, ומוזמן/ת לשתף ברשתות החברתיות ולתייג אותי 🤍</p>' +
            '<p style="margin:18px 0 0 0;">תודה שוב,<br><strong>טל</strong></p>' +
        '</div>';

    try {
        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: 'מציאות כפולה — טל הוך', email: 'noreply@metziotkfula.com' },
                replyTo: { email: 'Talbooks12@gmail.com', name: 'טל הוך' },
                to: [{ email: order.email, name: order.name }],
                subject: subject,
                textContent: text,
                htmlContent: html,
            }),
        });

        const result = await resp.json();
        if (!resp.ok) {
            console.error('Brevo error:', resp.status, result);
            return res.status(502).json({ error: 'Email send failed', detail: result });
        }
        return res.status(200).json({ ok: true, id: result.messageId });
    } catch (err) {
        console.error('send-customer-email error:', err);
        return res.status(500).json({ error: 'Internal error' });
    }
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
