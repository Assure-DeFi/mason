# Mason Brand Kit - Asset Inventory

This document provides a complete inventory of all assets included in the Mason Brand Kit.

## Folder Structure

```
brand/
├── logos/
│   ├── svg/                    # Vector logos (scalable)
│   └── png/                    # High-resolution raster logos
├── favicons/                   # Favicon package for web
├── docs/                       # Brand documentation
└── showcase/                   # Brand showcase images
```

## Logo Files

### SVG Files (Vector Format)

SVG files are resolution-independent and can be scaled to any size without loss of quality. These are the preferred format for most applications.

| File Name                      | Description                        | Dimensions | Best Use Cases                     |
| ------------------------------ | ---------------------------------- | ---------- | ---------------------------------- |
| `mason_icon.svg`               | Icon/brandmark                     | 2048x2048  | App icons, social media profiles   |
| `mason_logo_primary.svg`       | Primary logo with wordmark         | 2048x2048  | Websites, marketing materials      |
| `mason_logo_primary_white.svg` | White version for dark backgrounds | 2048x2048  | Dark backgrounds, hero sections    |
| `mason_logo_horizontal.svg`    | Horizontal layout                  | 2752x1536  | Headers, email signatures, banners |

### PNG Files (Raster Format)

High-resolution raster images for presentations, social media, and print applications.

| File Name                      | Description                      | Dimensions | Best Use Cases                              |
| ------------------------------ | -------------------------------- | ---------- | ------------------------------------------- |
| `mason_logo_primary.png`       | Detailed primary logo            | 2048x2048  | High-quality prints, large displays         |
| `mason_icon.png`               | Detailed icon on dark background | 2048x2048  | App store listings, profile images          |
| `mason_logo_horizontal.png`    | Horizontal layout                | Landscape  | Website banners, presentation headers       |
| `mason_logo_primary_white.png` | White logo for dark backgrounds  | 2048x2048  | Dark mode, night themes                     |
| `mason_logo_minimal.png`       | Simplified flat design           | 2048x2048  | Watermarks, subtle branding, favicon source |

## Favicon Package

Complete favicon set for web applications.

| File Name                    | Size       | Purpose               |
| ---------------------------- | ---------- | --------------------- |
| `favicon.ico`                | Multi-size | Browser tabs (legacy) |
| `favicon-16x16.png`          | 16x16      | Browser tabs          |
| `favicon-32x32.png`          | 32x32      | Browser tabs (retina) |
| `favicon-48x48.png`          | 48x48      | Windows tiles         |
| `apple-touch-icon.png`       | 180x180    | iOS home screen       |
| `android-chrome-192x192.png` | 192x192    | Android home screen   |
| `android-chrome-512x512.png` | 512x512    | Android splash screen |
| `site.webmanifest`           | -          | PWA manifest file     |

### Favicon HTML Usage

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#0A0724" />
```

## Documentation Files

| File Name               | Description                   |
| ----------------------- | ----------------------------- |
| `mason_brand_guide.md`  | Complete brand guidelines     |
| `assure_defi_colors.md` | Official color specifications |
| `ASSET_INVENTORY.md`    | This file                     |

## Showcase Files

| File Name                  | Description                         |
| -------------------------- | ----------------------------------- |
| `mason_brand_showcase.png` | Visual overview of all brand assets |

## Brand Color Specifications

| Color | Hex       | RGB             | Usage                                  |
| ----- | --------- | --------------- | -------------------------------------- |
| Navy  | `#0A0724` | `10, 7, 36`     | Primary background, figure fill        |
| Gold  | `#E2D243` | `226, 210, 67`  | Shield frame, star, accents            |
| White | `#FFFFFF` | `255, 255, 255` | Face opening, book pages, text on dark |
| Black | `#000000` | `0, 0, 0`       | Alternative dark color                 |

## Typography

| Element  | Font                   | Weight     | Letter Spacing |
| -------- | ---------------------- | ---------- | -------------- |
| Wordmark | Poppins                | Bold (700) | 0.1em          |
| Fallback | Inter, Segoe UI, Arial | Bold       | 0.1em          |

## Design Elements

The Mason logo features:

1. **Double-line hexagon shield** - Gold strokes forming the protective frame
2. **Hooded figure silhouette** - Geometric navy shape representing wisdom/knowledge
3. **Diamond face opening** - White negative space creating the mysterious face
4. **5-pointed star** - Gold star above the figure symbolizing guidance
5. **Open book** - White pages at the bottom representing knowledge/learning

## Version Information

- **Version:** 2.0
- **Last Updated:** January 28, 2026
- **SVG Design:** Clean geometric style based on v5_minimal.png

---

_This inventory is part of the official Mason Brand Kit._
