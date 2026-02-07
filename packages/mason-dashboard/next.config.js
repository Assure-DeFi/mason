/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security headers configuration
  // Protects against common web vulnerabilities (XSS, clickjacking, MIME-sniffing)
  async headers() {
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
          // Content Security Policy - primary defense against XSS
          // Critical for BYOD architecture where credentials are in localStorage
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.supabase.com https://api.github.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
