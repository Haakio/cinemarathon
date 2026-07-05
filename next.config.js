/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Le domaine technique Vercel (impossible à supprimer) redirige en
      // permanent (308) vers le domaine officiel : les moteurs de recherche
      // n'indexeront plus cinemarathon.vercel.app.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'cinemarathon.vercel.app' }],
        destination: 'https://xn--cinmarathon-dbb.com/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
