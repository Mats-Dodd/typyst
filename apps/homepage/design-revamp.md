# Haptic Landing Page Design Revamp Plan

## Overview

A cinematic, dark-mode landing page that merges **Linear's craft-led clarity** with **Outerbase's futuristic depth**, re-imagined through a disciplined Swiss-style grid and refined with monospace accents. Built with SvelteKit and Svelte Motion for smooth, performant animations.

## Design Principles

- **Swiss-Style Grid**: 12-column baseline grid for clarity and balance
- **Typographic Hierarchy**: Large grotesk headings + monospace UI labels
- **Dark Aesthetic**: Deep blacks (hsl(0 0% 7%)) with desaturated cyan accent
- **Motion Design**: Scroll-triggered reveals with 140ms entrance animations
- **Local-First Focus**: Emphasize speed, privacy, and offline capabilities

## Technical Stack

- **Framework**: SvelteKit 2.0
- **Animation**: Svelte Motion
- **Styling**: Tailwind CSS with custom design tokens
- **Typography**: Inter Tight (headings), System UI (body), UI Monospace (accents)
- **Performance**: Lazy loading, reduced motion support, <1MB hero assets

## Page Architecture

### Section Flow

| Section | Height | Key Features | Visual Treatment |
|---------|--------|--------------|------------------|
| Hero | 100vh | 3D note card stack, grid-aligned headline | Full-bleed gradient, perspective transforms |
| Why Local-First | 700px | Code snippet + offline diagram | Split layout on Swiss grid |
| Core Workflows | 650px | Horizontal gallery of GIFs | Linear-style module scrolling |
| AI Assist | 600px | Typewriter animation | Dark panel with star-field background |
| Social Proof | 500px | Logo strip + testimonials | Auto-scroll with fade-in quotes |
| Pricing & CTA | 600px | Plan cards with toggle | Clean cards with 1px borders |

## Implementation Plan

### Phase 1: Foundation Setup (Day 1-2)

#### 1.1 Dependencies
```bash
# Animation & utilities
pnpm add -D svelte-motion clsx tailwind-merge
pnpm add -D @tailwindcss/container-queries

# Typography
pnpm add -D @fontsource/inter-tight @fontsource-variable/inter
```

#### 1.2 Design System Updates

**New Color Palette**
```css
:root {
  /* Dark theme (default) */
  --background: 0 0% 7%;
  --background-elevated: 0 0% 9%;
  --foreground: 0 0% 90%;
  --accent: 190 70% 55%; /* Desaturated cyan */
  --border: 0 0% 18%;
  --muted: 0 0% 30%;
  
  /* Gradients */
  --gradient-dark: linear-gradient(to bottom, hsl(0 0% 7%), hsl(0 0% 9%));
  --gradient-hero: radial-gradient(at top center, hsl(0 0% 12%), hsl(0 0% 7%));
}
```

**Typography Scale**
```css
/* Headings - Inter Tight */
--text-6xl: clamp(2.5rem, 8vw, 4.5rem);
--text-5xl: clamp(2rem, 6vw, 3.5rem);
--text-4xl: clamp(1.75rem, 4vw, 2.5rem);

/* Body - System UI */
--text-base: 1rem;
--text-sm: 0.875rem;

/* Monospace - 85% size */
--text-mono: 0.85rem;
```

#### 1.3 File Structure
```
apps/homepage/src/
├── lib/
│   ├── components/
│   │   ├── sections/
│   │   │   ├── hero/
│   │   │   │   ├── hero.svelte
│   │   │   │   ├── note-stack.svelte
│   │   │   │   └── hero-cta.svelte
│   │   │   ├── local-first/
│   │   │   │   ├── local-first.svelte
│   │   │   │   ├── code-demo.svelte
│   │   │   │   └── offline-diagram.svelte
│   │   │   ├── workflows/
│   │   │   │   ├── workflows.svelte
│   │   │   │   ├── workflow-card.svelte
│   │   │   │   └── keyboard-hint.svelte
│   │   │   ├── ai-assist/
│   │   │   │   ├── ai-assist.svelte
│   │   │   │   ├── starfield.svelte
│   │   │   │   └── typewriter.svelte
│   │   │   ├── social-proof/
│   │   │   │   ├── social-proof.svelte
│   │   │   │   ├── logo-strip.svelte
│   │   │   │   └── testimonial.svelte
│   │   │   └── pricing/
│   │   │       ├── pricing.svelte
│   │   │       ├── pricing-card.svelte
│   │   │       └── plan-toggle.svelte
│   │   ├── layout/
│   │   │   ├── navbar.svelte
│   │   │   └── footer.svelte
│   │   └── shared/
│   │       ├── swiss-grid.svelte
│   │       ├── motion-section.svelte
│   │       └── gradient-blur.svelte
│   ├── animations/
│   │   ├── variants.ts
│   │   ├── scroll-spring.ts
│   │   └── easings.ts
│   └── utils/
│       ├── cn.ts
│       └── responsive.ts
```

### Phase 2: Core Components (Day 3-4)

#### 2.1 Swiss Grid Component
```svelte
<!-- lib/components/shared/swiss-grid.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils/cn';
  export let className = '';
</script>

<div class={cn(
  "grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12",
  "gap-4 md:gap-6 lg:gap-8",
  "max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8",
  className
)}>
  <slot />
</div>
```

#### 2.2 Motion Section Wrapper
```svelte
<!-- lib/components/shared/motion-section.svelte -->
<script lang="ts">
  import { Motion } from 'svelte-motion';
  import { inView } from '$lib/animations/variants';
  
  export let className = '';
  export let threshold = 0.3;
  export let delay = 0;
</script>

<Motion
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: threshold }}
  variants={inView}
  custom={delay}
  class={className}
>
  <slot />
</Motion>
```

#### 2.3 Animation Variants
```typescript
// lib/animations/variants.ts
export const fadeUp = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  visible: (delay = 0) => ({ 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.14,
      delay,
      ease: [0.16, 1, 0.3, 1] // Swift ease-out
    }
  })
};

export const card3D = {
  hidden: {
    opacity: 0,
    rotateX: -15,
    z: -100
  },
  visible: (i: number) => ({
    opacity: 1,
    rotateX: 0,
    z: -i * 50,
    transition: {
      duration: 0.5,
      delay: i * 0.1,
      ease: "easeOut"
    }
  })
};
```

### Phase 3: Section Components (Day 5-7)

#### 3.1 Hero Section
- **3D Note Stack**: CSS perspective with staggered cards
- **Grid Layout**: Headline col-span-7, cards col-span-5
- **Gradient Background**: Radial gradient with grain texture
- **CTA Buttons**: Auth-aware state (Sign Up vs Go to App)

#### 3.2 Local-First Section
- **Split Layout**: Code editor (col-span-6) + diagram (col-span-6)
- **Live Code Demo**: Syntax-highlighted markdown example
- **Offline Diagram**: Animated connection status indicator
- **Copy**: "Your notes, always. Online or off."

#### 3.3 Workflows Gallery
- **Horizontal Scroll**: Snap-scroll between features
- **Demo GIFs**: Command palette, file search, quick switcher
- **Keyboard Hints**: Floating cmd/ctrl key indicators
- **Progress Dots**: Navigation indicators

#### 3.4 AI Assist Section
- **Starfield Canvas**: WebGL particle background
- **Typewriter Effect**: Progressive text reveal
- **Dark Panel**: Elevated surface with subtle glow
- **Demo**: Note summarization in action

#### 3.5 Social Proof
- **Logo Strip**: Continuous horizontal scroll
- **Companies**: Linear, Vercel, Notion, Stripe logos
- **Testimonials**: Fade-in quotes with monospace attribution
- **Layout**: Centered on Swiss grid

#### 3.6 Pricing Section
- **Plan Toggle**: Monthly/Annual switch
- **Card Design**: 1px borders, hover elevation
- **Feature List**: Check icons with descriptions
- **CTA**: Sticky footer bar with primary action

### Phase 4: Interactions & Polish (Day 8-9)

#### 4.1 Micro-interactions
```typescript
// Hover states
button: "hover:scale-[0.98] active:scale-[0.96]"
card: "hover:shadow-xl hover:translate-y-[-2px]"
link: "hover:text-accent transition-colors"

// Focus states
"focus:outline-none focus:ring-2 focus:ring-accent/50"

// Selection
"selection:bg-accent/20 selection:text-accent"
```

#### 4.2 Scroll Behaviors
- **Smooth Scroll**: Native CSS with fallback
- **Parallax**: Subtle depth on hero elements
- **Reveal Timing**: 150ms stagger between elements
- **Progress Bar**: Reading position indicator

#### 4.3 Performance Optimizations
- **Image Loading**: Lazy load with blur-up placeholder
- **Font Loading**: Preload critical fonts
- **Code Splitting**: Dynamic imports for heavy sections
- **Reduced Motion**: Respect user preferences

### Phase 5: Content & Assets (Day 10)

#### 5.1 Asset Requirements
- **Hero Video**: 800KB max, 10s loop, MP4/WebM
- **Workflow GIFs**: 300KB each, optimized palette
- **Logo SVGs**: Monochrome versions for dark mode
- **OG Image**: 1200x630px with grid layout

#### 5.2 Copy Guidelines
- **Headline**: "Local-first notes. Zero friction."
- **Subheadline**: "Haptic saves instantly on-device and syncs when online"
- **CTAs**: "Try Haptic Free" / "Download for macOS"
- **Social Proof**: Developer testimonials with company attribution

### Implementation Checklist

#### Week 1
- [ ] Set up Svelte Motion and dependencies
- [ ] Create Swiss grid system
- [ ] Build motion component library
- [ ] Implement hero section with 3D stack
- [ ] Create local-first split layout

#### Week 2
- [ ] Build workflow gallery
- [ ] Implement AI assist with starfield
- [ ] Create social proof components
- [ ] Design pricing cards
- [ ] Add polish and interactions
- [ ] Performance optimization pass

### Technical Requirements

#### Performance Targets
- Lighthouse Score: >95
- First Contentful Paint: <1.5s
- Time to Interactive: <3.5s
- Cumulative Layout Shift: <0.1

#### Accessibility
- WCAG AA compliance
- Keyboard navigation support
- Screen reader announcements
- Focus trap for modals
- Reduced motion alternatives

#### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari/Chrome

### Deployment Considerations

#### Build Optimization
```javascript
// vite.config.ts additions
{
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'animations': ['svelte-motion'],
          'ui': ['@haptic/ui']
        }
      }
    }
  }
}
```

#### Environment Variables
```env
PUBLIC_WEB_APP_URL=https://app.haptic.md
PUBLIC_API_URL=https://api.haptic.md
```

### Monitoring & Analytics

- Core Web Vitals tracking
- Scroll depth analytics
- CTA click tracking
- Error boundary reporting

## Next Steps

1. have a coffee
2. Install dependencies and set up Svelte Motion
3. Build core grid and animation system
4. Implement sections progressively
5. Content creation and optimization
6. Cross-browser testing
7. Performance audit and optimization
8. Deploy to staging for review 