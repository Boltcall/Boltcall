=== Boltcall – Instant Lead Capture ===
Contributors: boltcall
Tags: lead capture, contact form, crm, sms, speed to lead, instant response, lead response
Requires at least: 5.8
Tested up to: 6.5
Requires PHP: 7.2
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Capture every form submission on your WordPress site instantly and respond within seconds via SMS, email, or voice.

== Description ==

**Boltcall** is a speed-to-lead platform for local service businesses. The first business to respond usually wins the job — this plugin makes sure that's you.

Every form submission on your site flows into Boltcall the moment it's sent. Your AI responds instantly by SMS, email, or phone, books the appointment, and hands the hot lead back to you.

= Features =

* **Native integrations** with Contact Form 7, WPForms, Gravity Forms, Elementor Pro Forms, Ninja Forms, and Fluent Forms — no form edits required.
* **Generic form embed** for custom forms — just add `data-boltcall` to any form, or enable auto-capture for all forms.
* **Auto-detect** which form plugins are installed, with per-plugin toggles.
* **Built-in test button** to verify the connection end-to-end.
* **Password/payment field filter** — sensitive fields are never forwarded.
* **Zero-config**: install, paste your Boltcall User ID, done.

= How It Works =

1. Install and activate the plugin.
2. Go to **Settings → Boltcall**.
3. Paste your Boltcall User ID (find it in your Boltcall dashboard → Instant Lead Reply → Web Form).
4. Paste your Boltcall API key (create one in your Boltcall dashboard → Settings → API Keys — starts with `bc_`).
5. Click **Send Test Lead** to verify.
6. Every form submission on your site now flows into Boltcall automatically.

= Requirements =

* A Boltcall account — sign up free at https://boltcall.org
* WordPress 5.8 or higher
* PHP 7.2 or higher

== Installation ==

1. Download the plugin ZIP from your Boltcall dashboard (Instant Lead Reply → WordPress).
2. In WordPress, go to **Plugins → Add New → Upload Plugin**.
3. Choose the ZIP file and click **Install Now**.
4. Activate the plugin.
5. Go to **Settings → Boltcall** and paste your User ID.

== Frequently Asked Questions ==

= Do my forms need any special markup? =

For Contact Form 7, WPForms, Gravity Forms, Elementor Pro Forms, Ninja Forms, and Fluent Forms — no. The plugin reads submissions directly from those plugins.

For any other form, add the attribute `data-boltcall` to the `<form>` tag, or enable **Auto-capture all forms** in the settings.

= Will this break my existing form workflow? =

No. The plugin reads submissions silently — it doesn't interfere with email notifications, confirmations, redirects, or anything else your form plugin does.

= What data gets sent to Boltcall? =

All non-sensitive form field values. Fields matching `password`, `card`, `cvv`, `ssn`, or `pin` are automatically filtered out before sending.

= Does this slow down my site? =

No. The generic embed script is ~6 KB, loaded async. Native form plugin hooks run server-side only when a form is submitted.

= What if I don't use a form plugin? =

Use the generic embed. Add `data-boltcall` to any `<form>` tag, or enable auto-capture to catch every form on the site.

== Screenshots ==

1. Settings page — paste your User ID and go.
2. Per-plugin integration toggles with auto-detection.
3. Built-in test button verifies the connection.

== Changelog ==

= 1.1.0 =
* Required: API key (`bc_...`) sent as `Authorization: Bearer` on every lead — matches the hardened webhook auth on boltcall.org.
* Field-name normalization: common form-plugin field names (`your-email`, `contact_phone`, `full_name`, ...) map to the canonical `email` / `phone` / `name` the webhook expects.
* Fixes Contact Form 7, WPForms, Ninja Forms, and Fluent Forms submissions being rejected with "email or phone required".

= 1.0.0 =
* Initial release.
* Native integrations: Contact Form 7, WPForms, Gravity Forms, Elementor Pro Forms, Ninja Forms, Fluent Forms.
* Generic form embed via `form.js`.
* Admin settings page with test button.
* Sensitive field filter (password/card/cvv/ssn/pin).

== Upgrade Notice ==

= 1.0.0 =
First release.
