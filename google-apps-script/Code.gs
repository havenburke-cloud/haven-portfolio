/**
 * Quote form to Gmail + Google Drive
 * ---------------------------------
 * Paste this whole file into a Google Apps Script project (script.google.com),
 * then deploy it as a Web app. Full steps are in README.md, step 1.
 *
 * Each quote request:
 *   - is emailed to you (reply to the email to reply to the client)
 *   - has its uploaded images saved to a Google Drive folder, linked in the email
 *     (and attached to the email too, when they're small enough)
 */

// Where to send requests. Leave blank to use the Google account that owns this script.
const NOTIFY_EMAIL = '';

// Drive folder that collects uploaded images (created automatically).
const DRIVE_FOLDER_NAME = 'Website quote requests';

// Attach images to the email when they add up to less than this (Gmail's limit is 25 MB).
const ATTACH_LIMIT_MB = 18;

// Send the client an automatic "thanks, I got it" email?
// Off by default: bots could otherwise use your form to send email from your address.
const SEND_AUTO_REPLY = false;

const MAX_IMAGES = 10;

/* ------------------------------------------------------------------------ */

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (d._gotcha) return json({ ok: true }); // spam trap

    const name = clean(d.name, 200);
    const email = clean(d.email, 200);
    const tier = clean(d.tier, 100);
    const details = clean(d.details, 10000);
    if (!name || !email || !tier || !details) {
      return json({ ok: false, error: 'Missing required fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ ok: false, error: 'Invalid email address.' });
    }

    const isQuestion = d.type === 'question';
    const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

    // Save images to Drive.
    const images = Array.isArray(d.images) ? d.images.slice(0, MAX_IMAGES) : [];
    const blobs = [];
    let totalBytes = 0;
    let folderUrl = '';
    if (images.length) {
      const folder = getOrCreateFolder_(DRIVE_FOLDER_NAME).createFolder(`${stamp} ${name}`);
      images.forEach((img, i) => {
        const type = /^image\//.test(img.type) ? img.type : 'application/octet-stream';
        const fileName = clean(img.name, 120) || `image-${i + 1}`;
        const blob = Utilities.newBlob(Utilities.base64Decode(String(img.data || '')), type, fileName);
        folder.createFile(blob);
        totalBytes += blob.getBytes().length;
        blobs.push(blob);
      });
      folderUrl = folder.getUrl();
    }

    const rows = [
      ['Name', name],
      ['Email', email],
      ['Phone', clean(d.phone, 50)],
      ['Business', clean(d.business, 200)],
      ['Instagram', clean(d.instagram, 200)],
      ['TikTok', clean(d.tiktok, 200)],
      ['Website', clean(d.website, 300)],
      ['Tier', isQuestion ? '' : tier],
    ].filter((r) => r[1]);

    const heading = isQuestion ? 'New question' : 'New quote request';
    const subject = isQuestion ? `New question from ${name}` : `New quote request: ${tier} from ${name}`;
    const detailsLabel = isQuestion ? 'Their question' : "What they're looking for";

    const attach = blobs.length && totalBytes <= ATTACH_LIMIT_MB * 1024 * 1024;
    const imagesLine = images.length
      ? `${images.length} image${images.length > 1 ? 's' : ''} saved to Google Drive: ${folderUrl}`
        + (attach ? ' (also attached)' : ' (too large to attach, open the Drive folder)')
      : 'No images uploaded.';

    const text = rows.map((r) => `${r[0]}: ${r[1]}`).join('\n')
      + `\n\n${detailsLabel}:\n${details}\n\n${imagesLine}\n\nReply to this email to reply to ${name}.`;

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#141414;max-width:600px">
        <h2 style="font-family:Georgia,serif;font-weight:normal">${heading}</h2>
        <table cellpadding="6" style="border-collapse:collapse">
          ${rows.map((r) => `<tr><td style="color:#4a4a4a;vertical-align:top">${esc(r[0])}</td><td>${linkify(r[1])}</td></tr>`).join('')}
        </table>
        <h3 style="font-family:Georgia,serif;font-weight:normal;margin-top:24px">${esc(detailsLabel)}</h3>
        <p style="white-space:pre-wrap">${esc(details)}</p>
        <p>${images.length
          ? `${images.length} image${images.length > 1 ? 's' : ''}: <a href="${esc(folderUrl)}">open in Google Drive</a>${attach ? ' (also attached)' : ''}`
          : 'No images uploaded.'}</p>
        <p style="color:#4a4a4a;font-size:13px">Reply to this email to reply to ${esc(name)}.</p>
      </div>`;

    MailApp.sendEmail({
      to,
      subject,
      body: text,
      htmlBody: html,
      replyTo: email,
      name: isQuestion ? 'Website question' : 'Website quote form',
      attachments: attach ? blobs : [],
    });

    if (SEND_AUTO_REPLY) {
      MailApp.sendEmail({
        to: email,
        subject: 'Thanks for your quote request',
        body: `Hi ${name.split(' ')[0]},\n\nThanks for reaching out! I've received your request and will get back to you soon.\n\nHaven`,
        replyTo: to,
        name: 'Haven',
      });
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Server error.' });
  }
}

// Visiting the Web app URL in a browser shows this, so you can check it's live.
function doGet() {
  return ContentService.createTextOutput('Quote form endpoint is running.');
}

/**
 * Run this once from the editor (select testSetup, then click Run) to grant permissions
 * and send yourself a sample request.
 */
function testSetup() {
  const sample = {
    name: 'Test Client',
    email: Session.getEffectiveUser().getEmail(),
    tier: 'Booking Site',
    details: 'This is a test request sent from the Apps Script editor.',
    images: [],
  };
  const res = doPost({ postData: { contents: JSON.stringify(sample) } });
  console.log(res.getContent());
}

/* ---------- helpers ---------- */
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function linkify(s) {
  return /^https?:\/\/\S+$/i.test(s) ? `<a href="${esc(s)}">${esc(s)}</a>` : esc(s);
}

function getOrCreateFolder_(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
