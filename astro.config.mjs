import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://envioya.saldoar.com',
  output: 'server',
  adapter: vercel(),
});
