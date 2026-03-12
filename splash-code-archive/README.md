# Splash Screen Code Archive

This folder contains a backup of the ThreeOrbitSplash component code for reference purposes.

## Files Included

- **ThreeOrbitSplash.js** - React component implementing the splash screen with Three.js orbit rings
- **ThreeOrbitSplash.css** - Styling for the splash screen, including animations and CSS orbit rings

## Key Features

### ThreeOrbitSplash.js
- React 17+ functional component with hooks
- Three.js 3D scene with center sphere and torus ring
- Dynamic orbit center tracking and synchronization
- CSS variable-driven layout system
- Responsive tool positioning (fixed and shooting star animations)
- ParallaxEffect with pointer following
- ResizeObserver for continuous viewport sync

### ThreeOrbitSplash.css
- CSS pseudo-element orbit rings anchored to computed center
- Gradient backgrounds and vignette effects
- Keyframe animations for fade, slide, pulse, and grid reveal
- Mobile-responsive breakpoints
- Reduced motion support for accessibility

## Alignment Mechanism

The component uses a multi-layered alignment system:

1. **DOM Measurement** - Badge element bounds tracked via ResizeObserver
2. **Center Computation** - Badge center converted to viewport ratios (0-1)
3. **CSS Variables** - Center broadcast as `--orbit-center-x` and `--orbit-center-y` (percentage values)
4. **CSS Rings** - Orbit rings positioned using `left: var(--orbit-center-x)` and `top: var(--orbit-center-y)` with `translate(-50%, -50%)`
5. **Three.js Sync** - Center reprojected into 3D world space via NDC unprojection

## Technical Stack

- **React** - UI component framework
- **Three.js** - 3D rendering engine
- **CSS3** - Animations, gradients, and pseudo-elements
- **ResizeObserver API** - Viewport tracking
- **RequestAnimationFrame** - Continuous animation loop

## References

This archive serves as a backup for:
- Historical reference during troubleshooting
- Rollback if needed
- Understanding the component architecture
- Training and documentation purposes
