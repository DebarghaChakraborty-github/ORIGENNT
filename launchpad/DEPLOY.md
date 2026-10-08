# LAUNCHPAD: deploy to Vercel

1. Replace the files in your Vercel project (or drag this folder into a new project). `index.html` is the whole site.
2. Add the domain `launchpad.origennt.com` in Vercel > Settings > Domains. At your DNS provider create:  CNAME  launchpad  ->  cname.vercel-dns.com
3. Test (see checklist below), then submit `https://launchpad.origennt.com/sitemap.xml` in Google Search Console.

## Keys already set inside index.html (search for `WEB3FORMS_KEY`)
- WEB3FORMS_KEY  : set. In the Web3Forms dashboard, restrict it to launchpad.origennt.com.
- RZP_KEY        : set (public Razorpay key id from internship.html). Run one small real payment.
- OWNER_WA_KEY   : EMPTY. CallMeBot key for WhatsApp alerts to +91 98611 68291.
- OWNER_WEBHOOK  : EMPTY. Alternative: a Make/Zapier webhook URL that sends WhatsApp alerts.

## Test checklist (live site)
- Save a cart with name, email and phone: an email "CART SAVED" should arrive.
- Type in a checkout form, close the tab: "LEAD (not purchased yet)" email.
- Pay a small amount: "PAID" email. Close the Razorpay window: "PAYMENT NOT COMPLETED" email.
- Open /?unsubscribe=1&email=you@example.com : "UNSUBSCRIBE" email.

## Still to do on your side
- Replace the hero photo (cropped from the mockup) with a licensed photo.
- Put the exact map pin in the geo tags (`geo.position`, `ICBM`, JSON-LD `geo`): currently 20.353, 85.819, approximate.
- Link ORIGENNT's Privacy Policy / Terms / Refund pages in the footer and cookie banner.
- Reminder emails (10 min, then daily) and WhatsApp reminders to customers need an email/WhatsApp platform connected to Web3Forms; the page only sends the events.
