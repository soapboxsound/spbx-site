/** Site-wide SEO and org constants. Product hosts are never linked for indexing. */
export const SITE_URL = 'https://www.spbx.io';
export const SITE_NAME = 'SPBX';
export const SITE_TAGLINE = 'Be Seen. Be Heard. Be Understood.';
export const SITE_DESCRIPTION =
  'Presentation & creative talent network for post-production & audio. One platform, fully branded — project, talent management, and client presentation.';
export const CONTACT_EMAIL = 'hi@spbx.io';
export const ORG_NAME = 'SPBX Corp';
export const ADMIN_URL = 'https://admin.spbx.io';

/** Optional Google Search Console verification (set PUBLIC_GOOGLE_SITE_VERIFICATION). */
export const GOOGLE_SITE_VERIFICATION =
  import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || '';

export const NAV = [
  { href: '/product', label: 'Product' },
  { href: '/for', label: 'For' },
  { href: '/manifesto', label: 'Manifesto' },
  { href: '/contact', label: 'Contact' },
] as const;
