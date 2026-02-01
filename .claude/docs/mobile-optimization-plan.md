# Mason Mobile Optimization Plan

## Overview

This plan ensures Mason works great on mobile devices, particularly iOS Safari and the Claude Code iOS app. The goal is mobile-first UX that doesn't compromise the desktop experience.

---

## Phase 1: Critical Fixes (COMPLETED)

### Safe Area Support ✓
- Added `viewportFit: 'cover'` to Next.js viewport config
- Created CSS utilities for safe area insets (`fixed-bottom-safe`, etc.)
- Updated all fixed-bottom elements to respect notch/home indicator

### iOS Compatibility CSS ✓
- Form input normalization (`-webkit-appearance: none`)
- Text rendering optimization (`-webkit-font-smoothing`)
- GPU acceleration for fixed elements (`transform: translateZ(0)`)
- Backdrop blur fallback for older iOS
- Touch scrolling optimization (`-webkit-overflow-scrolling: touch`)

### Files Modified
- `globals.css` - Added iOS compatibility section
- `layout.tsx` - Viewport configuration
- `bulk-actions-bar.tsx` - Safe area support
- `QuickStartFAB.tsx` - Safe area + GPU acceleration
- `AutopilotToast.tsx` - Safe area support
- `LandingHeader.tsx` - Backdrop fallback + safe area
- `DocsLayout.tsx` - Mobile toggle safe area
- `ErrorBanner.tsx` - Safe area support
- `CopyButton.tsx` - Safe area support
- `CopyCommand.tsx` - Safe area support
- All modal components - Backdrop blur fallback

---

## Phase 2: Touch Optimization

### Touch Targets
Minimum touch target size should be 44x44 pixels (Apple HIG recommendation).

**Areas to audit:**
- [ ] Backlog item checkboxes - increase hit area
- [ ] Status tabs - ensure adequate spacing
- [ ] Modal close buttons - verify size
- [ ] Navigation links - check spacing
- [ ] Quick action buttons - verify padding

### Touch Feedback
- [ ] Add `active:scale-95` to interactive elements for tactile feedback
- [ ] Add subtle background color change on touch (`active:bg-*`)
- [ ] Consider haptic feedback for key actions (if supported)

### Gesture Support
- [ ] Swipe-to-dismiss on modals
- [ ] Pull-to-refresh on backlog list (if feasible)
- [ ] Horizontal swipe on item cards for quick actions

---

## Phase 3: Mobile Layout Optimization

### Backlog Grid
Current: Cards display in grid, may be cramped on small screens.

**Improvements:**
- [ ] Single column layout on mobile (`grid-cols-1 sm:grid-cols-2`)
- [ ] Larger touch targets on cards
- [ ] Condensed card layout for mobile (hide secondary info)
- [ ] Sticky header with current filter visible

### Navigation
Current: Hamburger menu on mobile.

**Improvements:**
- [ ] Bottom navigation bar for primary actions (backlog, settings)
- [ ] Gesture-based navigation (swipe from edge)
- [ ] Floating action button for primary action (/pm-review)

### Item Detail View
Current: Side panel/modal.

**Improvements:**
- [ ] Full-screen modal on mobile
- [ ] Bottom sheet pattern for actions
- [ ] Larger PRD text for readability
- [ ] Collapsible sections for long content

### Forms & Inputs
- [ ] Larger input fields on mobile
- [ ] Auto-zoom prevention on focus
- [ ] Native select dropdowns where appropriate
- [ ] Numeric keyboard for number inputs

---

## Phase 4: Performance Optimization

### Loading States
- [ ] Skeleton loaders for content areas
- [ ] Optimistic updates for quick feedback
- [ ] Progressive loading for large lists

### Image Optimization
- [ ] Lazy loading for avatars
- [ ] Appropriate image sizes for mobile
- [ ] WebP with fallback

### Reduce Motion
Already implemented in globals.css for `prefers-reduced-motion`.

### Network Resilience
- [ ] Offline indicator
- [ ] Retry logic for failed requests
- [ ] Queue actions when offline

---

## Phase 5: Mobile-Specific Features

### Execution Monitoring
For Claude Code iOS app users:

- [ ] Push notification simulation (in-app banner when tab is backgrounded)
- [ ] Compact progress view optimized for mobile
- [ ] Quick-glance status cards

### Quick Actions
- [ ] One-tap approve/reject from list view
- [ ] Bulk selection mode with mobile-friendly UI
- [ ] Share PRD via native share sheet

### Dashboard Widgets
Consider for future:
- [ ] iOS widgets for execution status
- [ ] Shortcuts integration

---

## Phase 6: Testing

### Device Matrix
| Device | Screen Size | Test Priority |
|--------|-------------|---------------|
| iPhone 15 Pro Max | 430x932 | High |
| iPhone 15 | 393x852 | High |
| iPhone SE | 375x667 | High |
| iPhone 14 Pro (Dynamic Island) | 393x852 | High |
| iPad Mini | 768x1024 | Medium |
| iPad Pro | 1024x1366 | Medium |
| Android (Pixel) | 412x915 | Medium |

### Test Scenarios
1. **Safe Area Rendering**
   - Content visible below notch
   - FABs above home indicator
   - Modals don't clip

2. **Touch Interactions**
   - Buttons easy to tap
   - No accidental taps
   - Scroll not blocked

3. **Form Input**
   - Keyboard doesn't obscure inputs
   - No zoom on focus
   - Auto-complete works

4. **Orientation**
   - Landscape mode usable
   - Content reflows properly

5. **Performance**
   - Smooth scrolling
   - Fast page transitions
   - No jank on animations

---

## Implementation Priority

### Immediate (This Sprint)
1. Touch target audit and fixes
2. Mobile-specific card layout
3. Full-screen item detail on mobile

### Next Sprint
1. Bottom navigation pattern
2. Swipe gestures
3. Performance optimizations

### Future
1. Offline support
2. Native share integration
3. Widget consideration

---

## CSS Utilities Added

```css
/* Safe area utilities */
.safe-area-inset-bottom { padding-bottom: max(0.5rem, env(safe-area-inset-bottom)); }
.safe-area-inset-top { padding-top: max(0.5rem, env(safe-area-inset-top)); }
.fixed-bottom-safe { bottom: max(1rem, env(safe-area-inset-bottom)); }
.fixed-bottom-safe-md { bottom: max(2rem, env(safe-area-inset-bottom)); }

/* GPU acceleration */
.gpu-accelerated { transform: translateZ(0); will-change: transform; }

/* Backdrop blur fallback */
.backdrop-blur-fallback { background-color: rgba(0, 0, 0, 0.9); } /* when blur not supported */

/* Touch optimization */
.scroll-touch { -webkit-overflow-scrolling: touch; }
.touch-manipulation { touch-action: manipulation; }
```

---

## Brand Compliance Notes

All mobile optimizations must maintain:
- Navy (#0A0724) background
- Gold (#E2D243) accents
- Inter font family
- No rounded-full buttons
- No gradients
- Dark mode only
