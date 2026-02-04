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
          // Content Security Policy - Most effective XSS defense
          // Currently in report-only mode to monitor violations before enforcement
          // To enable enforcement: change key to 'Content-Security-Policy'
          // Monitor browser console for CSP violations during testing period
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'", // Only load resources from same origin by default
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline needed for Next.js inline scripts
              "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind CSS
              "img-src 'self' data: blob:", // Allow images from same origin, data URIs, and blobs
              "font-src 'self' data:", // Allow fonts from same origin and data URIs
              "connect-src 'self' https://*.supabase.co", // Allow API calls to Supabase
              "frame-ancestors 'none'", // Prevent embedding in iframes (reinforces X-Frame-Options)
              "base-uri 'self'", // Restrict base tag to same origin
              "form-action 'self'", // Only submit forms to same origin
              "upgrade-insecure-requests", // Automatically upgrade HTTP to HTTPS
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
