# SCSS Patterns

## Module Pattern

```scss
// front/src/features/LoginForm/ui/LoginForm.module.scss
@import 'app/styles/variables';
@import 'app/styles/mixins';

.loginForm {
  max-width: 400px;
  margin: 0 auto;
  padding: $spacing-lg;
  background: var(--bg-secondary);
  border-radius: $border-radius-lg;
  box-shadow: $shadow-md;

  @include respond-to(mobile) {
    padding: $spacing-md;
  }
}

.title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: var(--text-primary);
  margin-bottom: $spacing-lg;
  text-align: center;
}

.input {
  margin-bottom: $spacing-md;

  &:last-of-type {
    margin-bottom: $spacing-lg;
  }
}

.error {
  color: var(--color-error);
  font-size: $font-size-sm;
  margin-top: $spacing-xs;
}
```

## Patterns Checklist

- ✅ Import variables and mixins
- ✅ CSS variables для темизации (`var(--bg-secondary)`)
- ✅ BEM-like naming внутри модуля
- ✅ Responsive mixins (`@include respond-to(mobile)`)
- ✅ Локальные имена классов (module.scss)

## Using in Component

```typescript
import styles from './LoginForm.module.scss';

<form className={styles.loginForm}>
  <h2 className={styles.title}>Вход</h2>
  <div className={styles.input}>...</div>
</form>
```

## Variables

```scss
// front/src/app/styles/_variables.scss

// Spacing
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
$spacing-2xl: 48px;

// Font sizes
$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-md: 16px;
$font-size-lg: 18px;
$font-size-xl: 20px;
$font-size-2xl: 24px;
$font-size-3xl: 30px;

// Font weights
$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;

// Border radius
$border-radius-sm: 4px;
$border-radius-md: 8px;
$border-radius-lg: 12px;
$border-radius-full: 9999px;

// Shadows
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

// Breakpoints
$breakpoint-mobile: 480px;
$breakpoint-tablet: 768px;
$breakpoint-desktop: 1024px;
$breakpoint-wide: 1280px;
```

## Mixins

```scss
// front/src/app/styles/_mixins.scss

// Responsive
@mixin respond-to($breakpoint) {
  @if $breakpoint == mobile {
    @media (max-width: $breakpoint-mobile) { @content; }
  } @else if $breakpoint == tablet {
    @media (max-width: $breakpoint-tablet) { @content; }
  } @else if $breakpoint == desktop {
    @media (max-width: $breakpoint-desktop) { @content; }
  }
}

// Flexbox
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// Truncate text
@mixin truncate($lines: 1) {
  @if $lines == 1 {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

// Button reset
@mixin button-reset {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
}
```

## CSS Variables (Theming)

```scss
// front/src/app/styles/light.scss
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e5e5e5;

  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-muted: #999999;

  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;

  --border-color: #e5e5e5;
}

// front/src/app/styles/dark.scss
[data-theme='dark'] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #262626;
  --bg-tertiary: #333333;

  --text-primary: #ffffff;
  --text-secondary: #a3a3a3;
  --text-muted: #737373;

  --color-primary: #60a5fa;
  --color-primary-hover: #3b82f6;

  --border-color: #404040;
}
```

## Conditional Classes

```typescript
import clsx from 'clsx';

<div className={clsx(
  styles.card,
  isActive && styles.active,
  size === 'large' && styles.large,
  className
)}>
```

## Dynamic Styles

```typescript
<div
  className={styles.progress}
  style={{ '--progress': `${percent}%` } as React.CSSProperties}
/>
```

```scss
.progress {
  width: var(--progress, 0%);
}
```
