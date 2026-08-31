import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site?.href ?? 'https://example.com/';
  const body = `User-agent: *
Allow: /

Sitemap: ${base}sitemap-index.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
