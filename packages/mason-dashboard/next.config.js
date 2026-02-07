/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security headers configuration
  // Protects against common web vulnerabilities (XSS, clickjacking, MIME-sniffing)
  async headers() {
    // Content-Security-Policy directives
    // Uses 'unsafe-inline' for styles (required by Tailwind/Next.js CSS injection)
    // Uses 'unsafe-eval' only in development (required by Next.js HMR/Fast Refresh)
    const isDev = process.env.NODE_ENV === 'development';
    const cspDirectives = [
      "default-src 'self'",
      isDev
        ? "script-src 'self' 'unsafe-eval'"
        : "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.supabase.com https://*.supabase.co wss://*.supabase.co https://api.github.com https://github.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ];

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          // Prevent MIME-type sniffing (security risk from content-type confusion)
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking attacks (deny embedding in iframes)
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Enable browser XSS protection (legacy but still useful for older browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control what information is sent in Referer header
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Prevent browsers from accessing certain device features
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content-Security-Policy - controls which resources the browser is allowed to load
          // Mitigates XSS, data injection, and clickjacking attacks
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; '),
          },
          // Strict-Transport-Security - forces HTTPS for all future requests
          // max-age=1 year, includes subdomains, eligible for browser preload lists
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
