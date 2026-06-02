import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JiraOps Dashboard',
    short_name: 'JiraOps',
    description: 'Gestão Operacional em Tempo Real',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#0F172A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      }
    ],
  };
}
