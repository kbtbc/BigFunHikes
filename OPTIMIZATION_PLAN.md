# BigFun Hikes Optimization Plan

Comprehensive review based on Vercel React Best Practices, Web Interface Guidelines, and mobile UX patterns.

---

## CRITICAL - Mobile Experience Issues

### 1. Missing `touch-action: manipulation` (HIGH)
**Files:** `webapp/src/index.css`
**Issue:** No global touch optimization - causes 300ms tap delay on mobile Safari
**Fix:** Add to base styles:
```css
button, a, [role="button"] {
  touch-action: manipulation;
}
```

### 2. Missing `theme-color` meta tag (MEDIUM)
**Files:** `webapp/index.html`
**Issue:** Browser chrome doesn't match app theme on mobile
**Fix:** Add meta tag matching background color:
```html
<meta name="theme-color" content="#faf9f6" />
<meta name="theme-color" content="#1e2132" media="(prefers-color-scheme: dark)" />
```

### 3. Missing Safe Area Insets (HIGH)
**Files:** `webapp/src/index.css`, `webapp/src/components/Navbar.tsx`
**Issue:** Content can be hidden behind notches/home indicators on modern phones
**Fix:** Add safe area padding to navbar and page containers:
```css
.navbar { padding-top: env(safe-area-inset-top); }
body { padding-bottom: env(safe-area-inset-bottom); }
```

### 4. Icon-only buttons missing `aria-label` (HIGH)
**Files:** `webapp/src/components/Navbar.tsx:78-86`
**Issue:** Logout button has `title` but no `aria-label` - screen readers can't identify it
**Fix:** Add `aria-label="Logout"` to the button

---

## HIGH - Accessibility Issues

### 5. Form inputs missing `autocomplete` attributes
**Files:** `webapp/src/pages/NewEntryPage.tsx`, `webapp/src/pages/EditEntryPage.tsx`
**Issue:** Form inputs don't have proper autocomplete hints
**Fix:** Add appropriate `autocomplete` attributes:
- `autocomplete="off"` for custom fields
- `autocomplete="current-password"` for login

### 6. Missing `prefers-reduced-motion` handling (MEDIUM)
**Files:** `webapp/src/index.css`, `webapp/tailwind.config.ts`
**Issue:** Animations run regardless of user preference
**Fix:** Add reduced motion media query:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 7. Images missing explicit dimensions (MEDIUM)
**Files:** `webapp/src/pages/HomePage.tsx:32-38` (background), various photo components
**Issue:** Background image has no explicit sizing, can cause layout shift
**Fix:** Ensure all `<img>` tags have `width` and `height` attributes

---

## MEDIUM - Performance Optimizations

### 8. Barrel imports from lucide-react (HIGH IMPACT)
**Files:** Nearly all components
**Issue:** Importing multiple icons increases bundle size
**Current:** `import { Mountain, BookOpen, LogOut, Plus } from "lucide-react";`
**Fix:** Use direct imports:
```typescript
import Mountain from "lucide-react/dist/esm/icons/mountain";
```
*Or configure bundler to tree-shake properly*

### 9. YouTube iframe blocks main thread (MEDIUM)
**Files:** `webapp/src/pages/HomePage.tsx:71-79`
**Issue:** YouTube embed loads immediately, blocking initial render
**Fix:** Use `loading="lazy"` or defer with intersection observer:
```tsx
<iframe loading="lazy" ... />
```

### 10. Missing `fetchpriority` for hero image (LOW)
**Files:** `webapp/src/pages/HomePage.tsx:32-38`
**Issue:** Hero background image should load with high priority
**Fix:** If converted to `<img>`, add `fetchpriority="high"`

### 11. Font loading not optimized (MEDIUM)
**Files:** `webapp/src/index.css:1`
**Issue:** Google Fonts loaded via CSS @import blocks rendering
**Fix:** Move to `<link rel="preload">` in HTML head:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" as="style">
```

---

## MEDIUM - React Best Practices

### 12. Missing `useCallback` for event handlers in forms
**Files:** `webapp/src/pages/NewEntryPage.tsx`, `webapp/src/pages/EditEntryPage.tsx`
**Issue:** Form handlers recreated on every render, causing child re-renders
**Fix:** Wrap handlers in `useCallback`:
```typescript
const handleInputChange = useCallback((e) => {
  setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
}, []);
```

### 13. Derived state computed in effects instead of render
**Files:** Various components with `useEffect` updating state based on other state
**Issue:** Extra render cycles from effect-based state derivation
**Fix:** Compute derived values during render:
```typescript
// Instead of useEffect setting derivedValue
const derivedValue = useMemo(() => computeFrom(sourceState), [sourceState]);
```

### 14. Large page components should be split
**Files:** `webapp/src/pages/NewEntryPage.tsx` (1,071 lines)
**Issue:** Monolithic component harder to maintain and optimize
**Fix:** Extract into smaller components:
- `EntryTypeToggle`
- `LocationSection`
- `WeatherSection`
- `PhotoUploadSection`
- `ActivityDataSection`

---

## LOW - Code Quality & UX Polish

### 15. Missing loading states with skeleton
**Files:** Some pages use `Loader2` spinner instead of content skeletons
**Issue:** Layout shifts when content loads
**Fix:** Use `Skeleton` component matching content shape

### 16. Forms should warn before navigation with unsaved changes
**Files:** `webapp/src/pages/NewEntryPage.tsx`, `webapp/src/pages/EditEntryPage.tsx`
**Issue:** Users can accidentally lose form data by navigating away
**Fix:** Add `beforeunload` handler and React Router blocker

### 17. Number columns should use tabular-nums
**Files:** Stats displays, entry metrics
**Issue:** Numbers shift when values change (e.g., "1" vs "10")
**Fix:** Add `font-variant-numeric: tabular-nums` to number displays

### 18. Text overflow handling inconsistent
**Files:** Various card/list components
**Issue:** Long titles/content may break layouts
**Fix:** Ensure text containers use `truncate`, `line-clamp-*`, or `break-words`

### 19. Missing hover states on some interactive elements
**Files:** Various components
**Issue:** Some buttons/links don't have visible hover feedback
**Fix:** Ensure all interactive elements have `:hover` styles

---

## QUICK WINS (Can fix immediately)

| # | Issue | File | Effort |
|---|-------|------|--------|
| 1 | Add `aria-label` to logout button | Navbar.tsx:78 | 1 min |
| 2 | Add `theme-color` meta | index.html | 1 min |
| 3 | Add `loading="lazy"` to iframe | HomePage.tsx:72 | 1 min |
| 4 | Add reduced-motion query | index.css | 2 min |
| 5 | Add touch-action: manipulation | index.css | 2 min |
| 6 | Add safe-area-inset padding | index.css + Navbar | 5 min |

---

## Implementation Priority

### Phase 1: Mobile Critical (Do First)
1. Safe area insets (#3)
2. Touch action manipulation (#1)
3. Theme color meta (#2)
4. Aria-label on icon buttons (#4)

### Phase 2: Performance
5. Font preloading (#11)
6. Lazy load YouTube (#9)
7. Lucide tree-shaking (#8)

### Phase 3: Accessibility
8. Form autocomplete (#5)
9. Reduced motion (#6)
10. Image dimensions (#7)

### Phase 4: Code Quality
11. Split NewEntryPage (#14)
12. Add unsaved changes warning (#16)
13. Memoize form handlers (#12)

---

## Notes

- The codebase is generally well-structured with good patterns
- React Query caching is properly configured
- Offline support is well-implemented
- shadcn/ui components provide good accessibility baseline
- Dark mode CSS variables are defined but may need testing

**Estimated total effort:** 2-4 hours for all phases
