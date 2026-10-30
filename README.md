# Gina's Travel Agency — website

Static, single-page marketing site. No build step, no server, no database.

```
index.html      the whole site (HTML, CSS, JS)
assets/         9 photos (JPEG)
```

## How enquiries reach Gina

The site takes no bookings or payments. Every "Send enquiry", WhatsApp button and phone number opens WhatsApp (`wa.me/447432112769`) with the message pre-filled. To change the number, edit the one line `const WA = 'https://wa.me/447432112769';` in `index.html` and the `telephone` value in the JSON-LD block near the top.

## Deploy

Upload the folder contents (`index.html` + `assets/`) to any static host. Three easy options:

1. **Netlify Drop** — go to app.netlify.com/drop, drag the whole folder in. Live in seconds; add the custom domain under Site settings → Domain management.
2. **Cloudflare Pages / Vercel** — "Upload assets" / "Deploy static", point it at this folder.
3. **Existing cPanel / shared hosting** — upload `index.html` and the `assets/` folder into `public_html/`.

No environment variables, no secrets.

## Before launch, replace the placeholders

- Stats block: 4,800 travellers · 60 countries · 10 years · 98% — change `data-to` values in the `.stats` section.
- Testimonials: four sample quotes in the `#quotes` section.
- About copy: "10+ years" badge and the paragraph under "About Gina's".
- `og:image` meta tag: once live, change `assets/hero.jpg` to the full URL (e.g. `https://ginastravel.co.uk/assets/hero.jpg`) so link previews work on WhatsApp/Facebook.

## Fonts

Poppins and DM Sans load from Google Fonts. If the host blocks external requests, the site falls back to the system font and still works.
