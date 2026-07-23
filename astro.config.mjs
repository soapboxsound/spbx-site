// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Canonical host: www (apex should redirect to www in DNS/hosting)
const site = 'https://www.spbx.io';

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
