require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'yeshwanth.nammaweb@gmail.com';
const DATA_FILE = path.join(__dirname, 'data', 'bookings.json');

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const transporter = process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
  : null;

// basic in-memory rate limit: 5 requests / 10 min / IP
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 600000);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function saveBooking(b) {
  let all = [];
  try { all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}
  all.push(b);
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2));
}

app.post('/api/book', async (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ ok: false, message: 'Too many requests. Please try again later.' });
  const { name, email, phone, company, service, date, time, message, website } = req.body || {};
  if (website) return res.json({ ok: true }); // honeypot for bots

  const errors = [];
  if (!name || name.trim().length < 2) errors.push('Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) errors.push('Please enter a valid email.');
  if (!/^[+\d][\d\s-]{7,16}$/.test(phone || '')) errors.push('Please enter a valid phone number.');
  const d = new Date(date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!date || isNaN(d) || d < today) errors.push('Please choose a valid future date.');
  if (!time) errors.push('Please choose a time slot.');
  if (errors.length) return res.status(400).json({ ok: false, message: errors.join(' ') });

  const booking = {
    id: Date.now().toString(36),
    createdAt: new Date().toISOString(),
    name: name.trim(), email: email.trim(), phone: phone.trim(),
    company: (company || '').trim(), service: service || '', date, time,
    message: (message || '').trim().slice(0, 1500)
  };

  try { saveBooking(booking); } catch (e) {
    console.error('Save failed', e);
    return res.status(500).json({ ok: false, message: 'Server error. Please call or WhatsApp +91 72042 48002.' });
  }

  let emailed = false;
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Website Booking" <${process.env.SMTP_USER}>`,
        to: OWNER_EMAIL,
        replyTo: booking.email,
        subject: `New booking request: ${booking.name} - ${booking.date} ${booking.time}`,
        html: `<h2>New booking request</h2>
          <p><b>Name:</b> ${esc(booking.name)}<br><b>Email:</b> ${esc(booking.email)}<br><b>Phone:</b> ${esc(booking.phone)}<br>
          <b>Company:</b> ${esc(booking.company)}<br><b>Service:</b> ${esc(booking.service)}<br>
          <b>Date:</b> ${esc(booking.date)}<br><b>Time:</b> ${esc(booking.time)}</p>
          <p><b>Message:</b><br>${esc(booking.message).replace(/\n/g, '<br>')}</p>`
      });
      emailed = true;
    } catch (e) { console.error('Email failed:', e.message); }
  } else {
    console.warn('SMTP not configured - booking saved to data/bookings.json only.');
  }
  res.json({ ok: true, emailed, id: booking.id });
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use((_, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Site running on http://localhost:${PORT}`));
