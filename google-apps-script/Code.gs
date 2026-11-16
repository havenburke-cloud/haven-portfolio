/**
 * "Have a question?" form to Gmail
 * --------------------------------
 * Paste this whole file into your Google Apps Script project (script.google.com),
 * replacing what's there, then: Deploy > Manage deployments > Edit (pencil) >
 * Version: New version > Deploy. The web address stays the same.
 *
 * Each question is emailed to you; reply to the email to reply to the person.
 *
 * Safety:
 *   - Only name, email and question are accepted (no files), and each is length-limited.
 *   - Rate limits stop anyone flooding your inbox: at most PER_EMAIL_PER_HOUR messages
 *     from one email address, and TOTAL_PER_HOUR messages overall, in any hour.
 *   - A hidden "_gotcha" field catches simple spam bots.
 */

// Where to send questions. Leave blank to use the Google account that owns this script.
const NOTIFY_EMAIL = '';

const PER_EMAIL_PER_HOUR = 3;
const TOTAL_PER_HOUR = 30;

/* ------------------------------------------------------------------------ */

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (d._gotcha) return json({ ok: true }); // spam trap: pretend it worked

    const name = clean(d.name, 120);
    const email = clean(d.email, 200);
    const message = clean(d.details || d.message, 5000);
    if (!name || !email || !message) {
      return json({ ok: false, error: 'Missing required fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ ok: false, error: 'Invalid email address.' });
    }
    if (rateLimited_(email)) {
      return json({ ok: false, error: 'Too many messages. Please try again later.' });
    }

    const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();

    const text = `Name: ${name}\nEmail: ${email}\n\nTheir question:\n${message}\n\nReply to this email to reply to ${name}.`;
    const html = `
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#141414;max-width:600px">
        <h2 style="font-family:Georgia,serif;font-weight:normal">New question</h2>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td style="color:#4a4a4a">Name</td><td>${esc(name)}</td></tr>
          <tr><td style="color:#4a4a4a">Email</td><td>${esc(email)}</td></tr>
        </table>
        <h3 style="font-family:Georgia,serif;font-weight:normal;margin-top:24px">Their question</h3>
        <p style="white-space:pre-wrap">${esc(message)}</p>
        <p style="color:#4a4a4a;font-size:13px">Reply to this email to reply to ${esc(name)}.</p>
      </div>`;

    MailApp.sendEmail({
      to,
      subject: `New question from ${name}`,
      body: text,
      htmlBody: html,
      replyTo: email,
      name: 'Website question',
    });

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Server error.' });
  }
}

// Visiting the Web app URL in a browser shows this, so you can check it's live.
function doGet() {
  return ContentService.createTextOutput('Question form endpoint is running.');
}

/**
 * Run this once from the editor (choose testSetup, then click Run) to send
 * yourself a sample question.
 */
function testSetup() {
  const sample = {
    name: 'Test Visitor',
    email: Session.getEffectiveUser().getEmail(),
    details: 'This is a test question sent from the Apps Script editor.',
  };
  const res = doPost({ postData: { contents: JSON.stringify(sample) } });
  console.log(res.getContent());
}

/* ---------- helpers ---------- */

// True when this email address, or the form overall, has sent too many messages this hour.
function rateLimited_(email) {
  const cache = CacheService.getScriptCache();
  const hour = Math.floor(Date.now() / 3600000);
  const totalKey = 'total:' + hour;
  const emailKey = 'email:' + hour + ':' + email.toLowerCase();
  const total = Number(cache.get(totalKey) || 0);
  const mine = Number(cache.get(emailKey) || 0);
  if (total >= TOTAL_PER_HOUR || mine >= PER_EMAIL_PER_HOUR) return true;
  cache.put(totalKey, String(total + 1), 3700);
  cache.put(emailKey, String(mine + 1), 3700);
  return false;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
