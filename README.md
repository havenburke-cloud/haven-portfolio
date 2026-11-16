# Web Designs by Haven

Portfolio, booking and quote-request site. Plain HTML, CSS and vanilla JavaScript: no frameworks, no build step.

- **Book a consultation** ($20, paid through Stripe) goes to your **Google Calendar** (appointment schedule).
- **Quote requests** and **questions** go to your **Gmail**; uploaded images are saved to **Google Drive**.
- Hosted free on **GitHub Pages**.

```
index.html
css/styles.css
js/main.js                  ← the two settings you fill in are at the top
images/                     ← your photo and work screenshots (web-sized JPGs)
google-apps-script/Code.gs  ← paste into Google Apps Script (step 1)
```

---

## Step 1: Send quote requests to your Gmail (about 10 minutes)

This uses Google Apps Script, a free tool in your Google account. Requests are emailed to you, and uploaded images are saved in a Drive folder called **Website quote requests**.

1. Go to <https://script.google.com> (signed in to your Gmail account) and click **New project**.
2. Name it "Website quote form" (click "Untitled project" at the top).
3. Delete everything in the editor, then paste in the whole of [`google-apps-script/Code.gs`](google-apps-script/Code.gs). Click the save icon.
4. **Grant permissions and test:** in the toolbar dropdown choose **testSetup**, click **Run**, and approve the permissions it asks for. If you see "Google hasn't verified this app", click **Advanced → Go to Website quote form**; that's normal for your own scripts. You should get a "New quote request" test email in Gmail.
5. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, then copy the **Web app URL** (it ends in `/exec`).
6. In `js/main.js`, replace `YOUR_APPS_SCRIPT_URL_HERE` with that URL.

**If you change `Code.gs` later** (paste the new version over the old one first): go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same.

Options at the top of `Code.gs`:
- `NOTIFY_EMAIL`: send requests to a different address (blank = your Gmail).
- `SEND_AUTO_REPLY`: email clients a "thanks, I got it" note. It's off by default so bots can't use your form to send email from your address.

## Step 2: Let people book calls on your Google Calendar (about 5 minutes)

1. Open <https://calendar.google.com> on a computer and click **Create → Appointment schedule**.
2. Set the title (e.g. "Free website consultation"), length (the site says **20 minutes**; change that text in `index.html` if yours differs), your available hours, and whether to add a Google Meet link. Click **Save**.
3. Click the schedule on your calendar, then **Share**, and copy the **Booking page** link.
4. In `js/main.js`, set `BOOKING_URL` to that address. The site's "Choose a time" button opens it in a new tab.

Bookings land on your Google Calendar, and Google emails both you and the client. Appointment schedules are free with a personal Gmail account; some extras (such as checking several calendars or sending reminder emails) need a paid Google plan. Check Google's help page for the current details.

## Step 2b: Charge $20 for consultations (Stripe)

Payments need a paid Google plan (Google Workspace, or Google One Premium) **on the same account that owns the appointment schedule**. If the schedule still shows "Upgrade", it was made in an account without the plan.

1. In Google Calendar, click your appointment schedule → **pencil (Edit)**.
2. Open **Payments & cancellation policy** → turn on **Require payment** → **Connect Stripe account**.
3. Sign in to Stripe or create an account. Stripe asks for your business details, your bank account (for payouts) and ID verification. Use "Individual / sole proprietor" if you don't have a registered business.
4. Back in Google Calendar, set the **price to $20.00 USD**.
5. Add your **cancellation policy** (text below), then click **Save**.
6. Optional (premium): under **Booking form**, turn on **email verification**; under **Booking confirmations and reminders**, add an **email reminder** (e.g. 1 day before).

Suggested cancellation policy text:

> The $20 consultation fee is paid at booking and will be deducted from your final website price if you move forward. The fee is non-refundable if you decide not to go ahead. To reschedule, please give at least 24 hours' notice.

Stripe keeps a small fee per payment (about 2.9% + 30¢ in the US), so you receive about $19.12.

## Step 3: Publish your changes

After editing files, commit and push:

```sh
cd ~/Documents/projects/haven-portfolio
git add -A
git commit -m "Update site"
git push
```

GitHub Pages updates the live site within a minute or two.

---

## Preview locally

```sh
cd ~/Documents/projects/haven-portfolio
python3 -m http.server 8000
```

Open <http://localhost:8000> and stop the server with `Ctrl+C`. While `FORM_ENDPOINT` still says `YOUR_APPS_SCRIPT_URL_HERE`, the form runs in **preview mode**: it shows the confirmation with a note, but sends nothing.

---

## Placeholders to replace

| Where | Placeholder | Replace with |
| --- | --- | --- |
| `index.html`, Consultation card | `20 minutes` and `$20` | Your call length and fee, if they change |
| `index.html`, Confirmation | `[2 business days]` | Your real reply time |
| `index.html`, Footer | `hello@yourdomain.com` (link and text) | The email you want public |
| `index.html`, Footer | `https://instagram.com/yourhandle` | Your Instagram |
| `index.html`, Footer | `https://tiktok.com/@yourhandle` | Your TikTok |
| `index.html`, Footer | `https://www.linkedin.com/in/yourprofile` | Your LinkedIn, or delete the line |
| `index.html`, `<meta name="description">` | Site description | Your one-sentence description for Google |

Search tip: searching for `yourdomain`, `yourhandle`, `yourprofile` and `[` finds most of these.

---

## Customising

- **Colours, fonts, spacing:** CSS variables at the top of `css/styles.css` (`--accent`, `--font-serif`, …).
- **Upload limits:** top of `js/main.js`. Images are shrunk in the visitor's browser to 2000px before sending, so a phone photo uploads at well under 1 MB.
- **Custom domain:** buy a domain, then in GitHub go to the repo's **Settings → Pages → Custom domain** and follow the DNS instructions there.
