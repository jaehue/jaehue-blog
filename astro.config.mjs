// @ts-check

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://jaehue.github.io',
  integrations: [mdx(), sitemap(), react()],

  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },

  server: {
    host: true,
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['macmini', '.local'],
    },
    preview: {
      allowedHosts: ['macmini', '.local'],
    },
  },
});
