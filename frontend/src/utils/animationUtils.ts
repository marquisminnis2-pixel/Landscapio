/**
 * Animation Utilities
 *
 * CSS keyframes and animation helpers for the interaction system
 */

import { AnimationType, AnimationConfig, AnimationTiming } from '@/types/interaction.types';

/**
 * Get keyframes for a given animation type
 */
export const getAnimationKeyframes = (
  type: AnimationType,
  params: AnimationConfig['params'] = {}
): Keyframe[] => {
  const distance = params.distance || '20px';
  const scale = params.scale || 1.05;
  const degrees = params.degrees || 360;
  const intensity = params.intensity || 'normal';

  const intensityMap = {
    subtle: 3,
    normal: 6,
    strong: 10,
  };
  const shakeAmount = intensityMap[intensity];

  switch (type) {
    // Visibility
    case 'show':
      return [
        { visibility: 'hidden', opacity: 0 },
        { visibility: 'visible', opacity: 1 },
      ];

    case 'hide':
      return [
        { visibility: 'visible', opacity: 1 },
        { visibility: 'hidden', opacity: 0 },
      ];

    case 'toggle_visibility':
      // This needs to be handled by checking current state
      return [{ opacity: 1 }];

    // Fading
    case 'fade_in':
      return [{ opacity: 0 }, { opacity: 1 }];

    case 'fade_out':
      return [{ opacity: 1 }, { opacity: 0 }];

    case 'fade_toggle':
      // Handled by checking current state
      return [{ opacity: 1 }];

    // Sliding
    case 'slide_up':
      return [
        { transform: `translateY(${distance})`, opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ];

    case 'slide_down':
      return [
        { transform: `translateY(-${distance})`, opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ];

    case 'slide_left':
      return [
        { transform: `translateX(${distance})`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ];

    case 'slide_right':
      return [
        { transform: `translateX(-${distance})`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ];

    // Combos
    case 'slide_fade_in':
      return [
        { transform: `translateY(${distance})`, opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ];

    case 'slide_fade_out':
      return [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: `translateY(-${distance})`, opacity: 0 },
      ];

    // Transform
    case 'scale_up':
      return [{ transform: 'scale(1)' }, { transform: `scale(${scale})` }];

    case 'scale_down':
      return [{ transform: `scale(${scale})` }, { transform: 'scale(1)' }];

    case 'rotate':
      return [{ transform: 'rotate(0deg)' }, { transform: `rotate(${degrees}deg)` }];

    // Effects
    case 'bounce':
      return [
        { transform: 'translateY(0)', offset: 0 },
        { transform: 'translateY(-15px)', offset: 0.3 },
        { transform: 'translateY(0)', offset: 0.5 },
        { transform: 'translateY(-8px)', offset: 0.7 },
        { transform: 'translateY(0)', offset: 1 },
      ];

    case 'shake':
      return [
        { transform: 'translateX(0)', offset: 0 },
        { transform: `translateX(-${shakeAmount}px)`, offset: 0.1 },
        { transform: `translateX(${shakeAmount}px)`, offset: 0.2 },
        { transform: `translateX(-${shakeAmount}px)`, offset: 0.3 },
        { transform: `translateX(${shakeAmount}px)`, offset: 0.4 },
        { transform: `translateX(-${shakeAmount}px)`, offset: 0.5 },
        { transform: `translateX(${shakeAmount}px)`, offset: 0.6 },
        { transform: `translateX(-${shakeAmount}px)`, offset: 0.7 },
        { transform: `translateX(${shakeAmount}px)`, offset: 0.8 },
        { transform: 'translateX(0)', offset: 1 },
      ];

    case 'pulse':
      return [
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.05)', offset: 0.5 },
        { transform: 'scale(1)', offset: 1 },
      ];

    // Class operations (handled differently)
    case 'add_class':
    case 'remove_class':
    case 'toggle_class':
      return [];

    // Style operations
    case 'set_style':
      if (params.styles) {
        return [params.styles as Keyframe];
      }
      return [];

    default:
      return [];
  }
};

/**
 * Convert easing function to CSS string
 */
export const getEasingValue = (timing: AnimationTiming): string => {
  if (timing.easing === 'cubic-bezier' && timing.cubicBezier) {
    return `cubic-bezier(${timing.cubicBezier})`;
  }
  return timing.easing;
};

/**
 * Execute animation using Web Animations API
 */
export const executeWebAnimation = (
  element: HTMLElement,
  animation: AnimationConfig
): Animation | null => {
  const keyframes = getAnimationKeyframes(animation.type, animation.params);

  if (keyframes.length === 0) {
    // Handle class operations
    if (animation.type === 'add_class' && animation.params?.className) {
      element.classList.add(animation.params.className);
      return null;
    }
    if (animation.type === 'remove_class' && animation.params?.className) {
      element.classList.remove(animation.params.className);
      return null;
    }
    if (animation.type === 'toggle_class' && animation.params?.className) {
      element.classList.toggle(animation.params.className);
      return null;
    }
    return null;
  }

  const { duration, delay = 0, easing, cubicBezier } = animation.timing;

  const easingValue = easing === 'cubic-bezier' && cubicBezier ? `cubic-bezier(${cubicBezier})` : easing;

  return element.animate(keyframes, {
    duration,
    delay,
    easing: easingValue,
    fill: 'forwards',
  });
};

/**
 * Execute animation and return a promise that resolves when complete
 */
export const executeAnimationAsync = (element: HTMLElement, animation: AnimationConfig): Promise<void> => {
  return new Promise((resolve) => {
    const anim = executeWebAnimation(element, animation);

    if (!anim) {
      resolve();
      return;
    }

    anim.onfinish = () => resolve();
    anim.oncancel = () => resolve();
  });
};

/**
 * Execute multiple animations with optional stagger
 */
export const executeStaggeredAnimations = async (
  elements: HTMLElement[],
  animation: AnimationConfig,
  stagger: number = 0
): Promise<void> => {
  const promises = elements.map((element, index) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        executeAnimationAsync(element, animation).then(resolve);
      }, index * stagger);
    });
  });

  await Promise.all(promises);
};

/**
 * Check if element is currently visible
 */
export const isElementVisible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
};

/**
 * Get reverse animation type for toggle operations
 */
export const getReverseAnimationType = (type: AnimationType): AnimationType => {
  const reverseMap: Partial<Record<AnimationType, AnimationType>> = {
    show: 'hide',
    hide: 'show',
    fade_in: 'fade_out',
    fade_out: 'fade_in',
    slide_up: 'slide_down',
    slide_down: 'slide_up',
    slide_left: 'slide_right',
    slide_right: 'slide_left',
    scale_up: 'scale_down',
    scale_down: 'scale_up',
    slide_fade_in: 'slide_fade_out',
    slide_fade_out: 'slide_fade_in',
  };

  return reverseMap[type] || type;
};

/**
 * Prepare element for animation (set initial state)
 */
export const prepareElementForAnimation = (element: HTMLElement, animationType: AnimationType): void => {
  // For fade-in animations, start hidden
  if (['fade_in', 'slide_fade_in', 'slide_up', 'slide_down', 'slide_left', 'slide_right'].includes(animationType)) {
    element.style.opacity = '0';
  }

  // For show animations, start hidden
  if (animationType === 'show') {
    element.style.visibility = 'hidden';
    element.style.opacity = '0';
  }
};

/**
 * Reset element after animation
 */
export const resetElementAfterAnimation = (element: HTMLElement): void => {
  element.style.opacity = '';
  element.style.visibility = '';
  element.style.transform = '';
};
