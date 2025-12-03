# Premium Design System v2.0

**Institutional-grade Dark/Light Theme System**

## Quick Start

```css
/* 1. design-system.css를 프로젝트에 복사 */
/* 2. 포인트 색상만 변경 */
:root {
  --color-point: #FF6B00;           /* 원하는 브랜드 색상 */
  --color-point-hover: #E65A00;     /* 10% 어둡게 */
  --color-point-dim: rgba(255, 107, 0, 0.15);
}
```

---

## Color Palette

### Point Color (Customizable)
| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--color-point` | #0052FF | #0052FF | Primary actions, links |
| `--color-point-hover` | #0038B3 | #0038B3 | Hover states |
| `--color-point-dim` | rgba(0,82,255,0.15) | rgba(0,82,255,0.1) | Backgrounds |

### Semantic Colors (Fixed)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | #00C805 | Profit, positive |
| `--color-danger` | #FF3B30 | Loss, negative |
| `--color-warning` | #FF9500 | Alerts, pending |

### Backgrounds
| Token | Dark | Light |
|-------|------|-------|
| `--bg-app` | #050505 | gradient |
| `--bg-primary` | #0A0A0A | rgba(255,255,255,0.8) |
| `--bg-secondary` | #111111 | rgba(255,255,255,0.6) |
| `--bg-tertiary` | #161616 | rgba(255,255,255,0.4) |
| `--bg-elevated` | #1C1C1E | #FFFFFF |

### Text Colors
| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--fg-primary` | #FFFFFF | #1C1C1E | Main text |
| `--fg-secondary` | #8E8E93 | #48484A | Secondary text |
| `--fg-tertiary` | #636366 | #8E8E93 | Muted text |
| `--fg-muted` | #48484A | #AEAEB2 | Disabled |

---

## Typography

### Font Families
```css
--font-sans: 'Pretendard Variable', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Data Display Classes
```html
<span class="data-value data-value-xl text-success">+128.5%</span>
<span class="data-label">Total Profit</span>
```

| Class | Size |
|-------|------|
| `.data-value-sm` | 14px |
| `.data-value-base` | 16px |
| `.data-value-lg` | 24px |
| `.data-value-xl` | 32px |
| `.data-value-2xl` | 40px |

---

## Components

### Buttons
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-danger">Danger</button>
<button class="btn btn-sm">Small</button>
<button class="btn btn-icon">🔔</button>
```

### Badges
```html
<span class="badge badge-success">Active</span>
<span class="badge badge-danger">Error</span>
<span class="badge badge-point">New</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-live">LIVE</span>
```

### Glass Card
```html
<div class="glass-card">
  <!-- Glassmorphism effect -->
</div>
```

### Tabs
```html
<div class="tab-container">
  <button class="tab-button active">Tab 1</button>
  <button class="tab-button">Tab 2</button>
</div>
```

### Input
```html
<input class="input" placeholder="Enter value..." />
```

### Connection Status
```html
<div class="connection-status connected">
  <span class="connection-dot"></span>
  Connected
</div>
```

### Skeleton Loading
```html
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-title"></div>
<div class="skeleton skeleton-avatar"></div>
<div class="skeleton skeleton-card"></div>
```

### Tooltip
```html
<div class="tooltip">
  Hover me
  <div class="tooltip-content">Tooltip text</div>
</div>
```

---

## Spacing Scale

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
```

---

## Border Radius

```css
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
--radius-2xl: 24px
--radius-full: 9999px
```

---

## Shadows

| Token | Usage |
|-------|-------|
| `--shadow-xs` | Subtle elevation |
| `--shadow-sm` | Cards |
| `--shadow-md` | Dropdowns |
| `--shadow-lg` | Modals |
| `--shadow-xl` | Popovers |
| `--shadow-glow` | Point color glow |
| `--shadow-glow-success` | Success glow |
| `--shadow-glow-danger` | Danger glow |

---

## Animations

```html
<div class="animate-fade-in">Fade in</div>
<div class="animate-slide-up">Slide up</div>
<div class="animate-slide-down">Slide down</div>
<div class="animate-scale-in">Scale in</div>
```

---

## Theme Toggle (JavaScript)

```javascript
// Switch to light mode
document.documentElement.setAttribute('data-theme', 'light');

// Switch to dark mode
document.documentElement.removeAttribute('data-theme');

// Toggle
function toggleTheme() {
  const isDark = !document.documentElement.hasAttribute('data-theme');
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}
```

---

## Z-Index Scale

```css
--z-dropdown: 100
--z-sticky: 200
--z-fixed: 300
--z-modal-backdrop: 400
--z-modal: 500
--z-popover: 600
--z-tooltip: 700
```

---

## Brand Color Examples

```css
/* Coinbase Blue (Default) */
--color-point: #0052FF;

/* Toss Blue */
--color-point: #3182F6;

/* Stripe Purple */
--color-point: #635BFF;

/* Robinhood Green */
--color-point: #00C805;

/* Binance Yellow */
--color-point: #F0B90B;

/* Orange */
--color-point: #FF6B00;

/* Red */
--color-point: #FF3B30;
```

---

## Files

| File | Description |
|------|-------------|
| `design-system.css` | Complete CSS design system |
| `DESIGN-SYSTEM.md` | This documentation |

---

**Version:** 2.0
**Compatibility:** Tailwind CSS 4.0+, Pure CSS
**Theme Support:** Dark (default), Light
