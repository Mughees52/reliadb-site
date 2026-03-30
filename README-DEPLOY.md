# ReliaDB Website — Deployment Guide

Complete step-by-step instructions to get your website live at **reliadb.com**.

---

## What You Have

A complete static HTML website with:
- **Homepage** (index.html) — hero, services, testimonial, CTA
- **Services page** (services.html) — detailed service descriptions and pricing
- **Results page** (results.html) — two full case studies
- **About page** (about.html) — your story, expertise, timezone advantage
- **Contact page** (contact.html) — Formspree contact form
- **Blog** (blog/index.html) — blog listing page with sidebar
- **First blog post** — full PostgreSQL diagnostic guide
- **Blog post template** (blog/post-template.html) — copy this for every new post
- **Admin panel** (admin/) — Decap CMS at reliadb.com/admin for writing blog posts
- **Netlify config** (netlify.toml) — security headers, redirect rules

---

## Step 1: Set Up a Free Formspree Account (Contact Form)

1. Go to **formspree.io** and sign up for a free account
2. Click **New Form** → give it a name like "ReliaDB Contact"
3. Set the notification email to: **mughees52@gmail.com**
4. Copy the **Form ID** (looks like `xdoqkjlp`)
5. Open `contact.html` and find this line:
   ```
   action="https://formspree.io/f/YOUR_FORM_ID"
   ```
   Replace `YOUR_FORM_ID` with your actual ID, e.g.:
   ```
   action="https://formspree.io/f/xdoqkjlp"
   ```
6. Save the file

---

## Step 2: Upload the Site to GitHub

1. Go to **github.com** and sign in (or sign up for free)
2. Click **New repository**
3. Name it `reliadb-site` (or anything you like)
4. Make it **Public** (required for free Netlify)
5. Click **Create repository**
6. On your computer, open a terminal and navigate to the site folder:
   ```bash
   cd path/to/reliadb-site
   git init
   git add .
   git commit -m "Initial website commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/reliadb-site.git
   git push -u origin main
   ```
   Replace `YOUR-USERNAME` with your GitHub username.

> **Alternative (no terminal):** On the GitHub repo page, click "uploading an existing file" and drag all your site files in.

---

## Step 3: Deploy to Netlify

1. Go to **netlify.com** and sign in with your GitHub account
2. Click **Add new site** → **Import an existing project** → **GitHub**
3. Select your `reliadb-site` repository
4. Leave build settings empty (no build command needed — it's a static site)
5. Click **Deploy site**

Netlify will give you a random URL like `amazing-turing-abc123.netlify.app`. Your site is live!

---

## Step 4: Enable the Blog Admin Panel (Decap CMS)

The admin panel lives at `/admin` and lets you write blog posts through a browser — no code needed.

### 4a. Enable Netlify Identity
1. In your Netlify dashboard, go to **Site settings** → **Identity**
2. Click **Enable Identity**
3. Under **Registration**, choose **Invite only** (so only you can log in)
4. Click **Save**

### 4b. Enable Git Gateway
1. Still in **Identity** settings, scroll to **Services**
2. Click **Enable Git Gateway**
3. This allows Decap CMS to commit to your GitHub repo on your behalf

### 4c. Invite yourself as a user
1. In **Identity** → **Users**, click **Invite users**
2. Enter your email address
3. Check your email and click the confirmation link
4. Set a password

### 4d. Access the admin panel
1. Go to `https://your-site-url.netlify.app/admin`
2. Log in with the email/password you just set
3. You'll see the Decap CMS dashboard — click **New Blog Post** to write your first post!

> **Note:** When you publish a post through the admin panel, Decap CMS creates a Markdown file in `_posts/` and commits it to your GitHub repo. The static blog listing page (`blog/index.html`) is separate and you update it manually by adding a card.

---

## Step 5: Connect Your Domain (reliadb.com)

### 5a. Add your domain in Netlify
1. In your Netlify site dashboard, go to **Domain management** → **Add domain**
2. Type `reliadb.com` and click **Verify** → **Add domain**
3. Also add `www.reliadb.com` as an alias

### 5b. Update DNS in Hostinger
1. Log in to **hpanel.hostinger.com**
2. Go to **Domains** → **reliadb.com** → **DNS / Nameservers**
3. Choose **Change nameservers**
4. Replace your current nameservers with Netlify's:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```
   (Netlify shows you the exact nameservers in your Domain management screen)
5. Save. DNS changes can take up to 24–48 hours to propagate.

### 5c. Enable HTTPS
Once your domain is connected, Netlify automatically provisions a free SSL certificate via Let's Encrypt. Go to **Domain management** → **HTTPS** → **Verify DNS configuration** → click **Provision certificate**.

---

## Step 6: Set Up Email Forwarding (Hostinger)

So that mughees@reliadb.com forwards to mughees52@gmail.com:

1. In Hostinger hPanel, go to **Email** → **Email accounts**
2. Create a forwarder: `mughees@reliadb.com` → `mughees52@gmail.com`

Or set up a free business email via **Zoho Mail** (one free mailbox):
1. Go to zoho.com/mail and sign up free
2. Add your domain, verify it via DNS TXT record in Hostinger
3. Create mughees@reliadb.com as your mailbox

---

## Writing New Blog Posts

### Option A: Through the Admin Panel (no code)
1. Go to `reliadb.com/admin`
2. Log in → **New Blog Post**
3. Fill in title, description, category, and write your post in the editor
4. Click **Publish** — the post is committed to GitHub

Then add a card for it in `blog/index.html` by copying one of the existing `<a class="post-card-h">` blocks and updating the title, description, link, category, date, and read time.

### Option B: Copy the Template (HTML)
1. Copy `blog/post-template.html`
2. Rename it to a URL-friendly slug, e.g. `mysql-replication-lag-production.html`
3. Replace the placeholder text with your content
4. Add a card for it in `blog/index.html`
5. Commit and push to GitHub — Netlify auto-deploys in ~30 seconds

---

## Updating the Site

Any time you change a file and push to GitHub, Netlify automatically rebuilds and deploys within 30–60 seconds. No manual uploads needed.

```bash
git add .
git commit -m "Update services page pricing"
git push
```

That's it — the live site updates automatically.

---

## File Structure Reference

```
reliadb-site/
├── index.html              ← Homepage
├── services.html           ← Services page
├── results.html            ← Case studies
├── about.html              ← About page
├── contact.html            ← Contact form
├── netlify.toml            ← Netlify config
├── css/
│   └── style.css           ← All styles (don't edit unless you know CSS)
├── js/
│   └── main.js             ← Nav, form, animations
├── images/                 ← Put your images here
├── blog/
│   ├── index.html          ← Blog listing page (update manually per post)
│   ├── post-template.html  ← Copy this for new posts
│   └── postgresql-running-slow-diagnostic-guide.html  ← First post
├── _posts/                 ← Markdown files created by Decap CMS
│   └── *.md
└── admin/
    ├── index.html          ← Decap CMS app
    └── config.yml          ← CMS configuration
```

---

## Help & Support

If you get stuck on any of these steps, refer to:
- **Netlify docs**: docs.netlify.com
- **Decap CMS docs**: decapcms.org/docs
- **Formspree docs**: help.formspree.io
