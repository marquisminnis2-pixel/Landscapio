/**
 * Interaction System Types
 *
 * Enables click/hover/scroll triggered animations
 * Distinct from behavior.types.ts which handles analytics-based behavior changes
 */

// ============================================
// TRIGGER TYPES
// ============================================

export type InteractionTriggerType =
  | 'click'
  | 'hover'
  | 'hover_out'
  | 'mouse_enter'
  | 'mouse_leave'
  | 'scroll_into_view'
  | 'scroll_out_of_view'
  | 'page_load';

export interface InteractionTrigger {
  type: InteractionTriggerType;

  // Scroll-specific options
  scrollOptions?: {
    threshold?: number; // 0-1, how much of element needs to be visible
    once?: boolean; // Only trigger once
    offset?: string; // e.g., '100px' from viewport edge
  };

  // Page load specific
  pageLoadOptions?: {
    delay?: number; // ms to wait after page load
  };
}

// ============================================
// TARGET TYPES
// ============================================

export type InteractionTargetType =
  | 'self'
  | 'children'
  | 'all_children'
  | 'parent'
  | 'siblings'
  | 'specific';

export interface InteractionTarget {
  type: InteractionTargetType;
  elementId?: string; // For 'specific' target type
}

// ============================================
// ANIMATION TYPES
// ============================================

export type AnimationType =
  // Visibility
  | 'show'
  | 'hide'
  | 'toggle_visibility'
  // Fading
  | 'fade_in'
  | 'fade_out'
  | 'fade_toggle'
  // Sliding
  | 'slide_up'
  | 'slide_down'
  | 'slide_left'
  | 'slide_right'
  // Transform
  | 'scale_up'
  | 'scale_down'
  | 'rotate'
  // Effects
  | 'bounce'
  | 'shake'
  | 'pulse'
  // Combos
  | 'slide_fade_in'
  | 'slide_fade_out'
  // State
  | 'add_class'
  | 'remove_class'
  | 'toggle_class'
  | 'set_style';

export type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier';

export interface AnimationTiming {
  duration: number; // milliseconds
  delay?: number; // milliseconds
  easing: EasingFunction;
  cubicBezier?: string; // e.g., '0.4, 0, 0.2, 1' for custom easing
  stagger?: number; // ms delay between children (for children target)
}

export interface AnimationConfig {
  type: AnimationType;
  timing: AnimationTiming;

  // Animation-specific parameters
  params?: {
    // For move animation
    translateX?: string;
    translateY?: string;

    // For scale animations
    scale?: number;
    scaleX?: number;
    scaleY?: number;

    // For rotate animation
    degrees?: number;

    // For slide animations
    distance?: string; // e.g., '100px', '100%'

    // For class animations
    className?: string;

    // For set_style
    styles?: Record<string, string>;

    // For intensity of shake/bounce/pulse
    intensity?: 'subtle' | 'normal' | 'strong';
  };
}

// ============================================
// ACTION TYPES
// ============================================

export interface InteractionAction {
  id: string;
  target: InteractionTarget;
  animation: AnimationConfig;

  // For sequences: run this action after previous completes
  afterPrevious?: boolean;
}

// ============================================
// TOGGLE STATE
// ============================================

export interface ToggleState {
  id: string;
  name: string; // e.g., 'dropdown-open', 'menu-expanded'
  initialState: boolean; // false = closed/hidden, true = open/visible
}

// ============================================
// COMPLETE INTERACTION DEFINITION
// ============================================

export interface Interaction {
  id: string;
  name: string;
  enabled: boolean;

  trigger: InteractionTrigger;
  actions: InteractionAction[];

  // Optional: Toggle behavior
  toggle?: {
    stateId: string;
    onTrue: InteractionAction[];
    onFalse: InteractionAction[];
  };

  // Trigger restrictions
  options?: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    debounce?: number;
    throttle?: number;
    onlyOnce?: boolean;
  };
}

// ============================================
// PRESETS
// ============================================

export interface InteractionPreset {
  id: string;
  name: string;
  description: string;
  category: 'dropdown' | 'modal' | 'animation' | 'navigation' | 'scroll';
  interactions: Omit<Interaction, 'id'>[];
  toggleStates?: Omit<ToggleState, 'id'>[];
}

export const INTERACTION_PRESETS: InteractionPreset[] = [
  {
    id: 'dropdown-toggle',
    name: 'Dropdown Toggle',
    description: 'Click to show/hide dropdown content',
    category: 'dropdown',
    toggleStates: [{ name: 'dropdown-open', initialState: false }],
    interactions: [
      {
        name: 'Toggle Dropdown',
        enabled: true,
        trigger: { type: 'click' },
        actions: [],
        toggle: {
          stateId: 'dropdown-open',
          onTrue: [
            {
              id: '',
              target: { type: 'children' },
              animation: {
                type: 'slide_fade_in',
                timing: { duration: 200, easing: 'ease-out' },
                params: { distance: '10px' },
              },
            },
          ],
          onFalse: [
            {
              id: '',
              target: { type: 'children' },
              animation: {
                type: 'slide_fade_out',
                timing: { duration: 150, easing: 'ease-in' },
                params: { distance: '10px' },
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'fade-in-on-scroll',
    name: 'Fade In on Scroll',
    description: 'Element fades in when scrolled into view',
    category: 'scroll',
    interactions: [
      {
        name: 'Scroll Fade In',
        enabled: true,
        trigger: {
          type: 'scroll_into_view',
          scrollOptions: { threshold: 0.2, once: true },
        },
        actions: [
          {
            id: '',
            target: { type: 'self' },
            animation: {
              type: 'fade_in',
              timing: { duration: 600, easing: 'ease-out' },
            },
          },
        ],
      },
    ],
  },
  {
    id: 'slide-up-on-scroll',
    name: 'Slide Up on Scroll',
    description: 'Element slides up and fades in when scrolled into view',
    category: 'scroll',
    interactions: [
      {
        name: 'Scroll Slide Up',
        enabled: true,
        trigger: {
          type: 'scroll_into_view',
          scrollOptions: { threshold: 0.2, once: true },
        },
        actions: [
          {
            id: '',
            target: { type: 'self' },
            animation: {
              type: 'slide_fade_in',
              timing: { duration: 600, easing: 'ease-out' },
              params: { distance: '30px' },
            },
          },
        ],
      },
    ],
  },
  {
    id: 'hover-scale',
    name: 'Hover Scale',
    description: 'Element scales up on hover',
    category: 'animation',
    interactions: [
      {
        name: 'Scale Up on Hover',
        enabled: true,
        trigger: { type: 'hover' },
        actions: [
          {
            id: '',
            target: { type: 'self' },
            animation: {
              type: 'scale_up',
              timing: { duration: 200, easing: 'ease-out' },
              params: { scale: 1.05 },
            },
          },
        ],
      },
      {
        name: 'Scale Down on Leave',
        enabled: true,
        trigger: { type: 'hover_out' },
        actions: [
          {
            id: '',
            target: { type: 'self' },
            animation: {
              type: 'scale_down',
              timing: { duration: 200, easing: 'ease-out' },
              params: { scale: 1 },
            },
          },
        ],
      },
    ],
  },
  {
    id: 'hover-fade',
    name: 'Hover Fade',
    description: 'Element fades on hover',
    category: 'animation',
    interactions: [
      {
        name: 'Fade on Hover',
        enabled: true,
        trigger: { type: 'hover' },
        actions: [
          {
            id: '',
            target: { type: 'self' },
            animation: {
              type: 'set_style',
              timing: { duration: 200, easing: 'ease-out' },
              params: { styles: { opacity: '0.7' } },
            },
          },
        ],
      },
      {
        name: 'Restore on Leave',
        enabled: true,
        trigger: { type: 'hover_out' },
        actions: [
          {
            id: '',
            target: { type: 'self' },
            animation: {
              type: 'set_style',
              timing: { duration: 200, easing: 'ease-out' },
              params: { styles: { opacity: '1' } },
            },
          },
        ],
      },
    ],
  },
  {
    id: 'page-load-fade',
    name: 'Page Load Fade In',
    description: 'Element fades in when page loads',
    category: 'animation',
    interactions: [
      {
        name: 'Fade In on Load',
        enabled: true,
        trigger: {
          type: 'page_load',
          pageLoadOptions: { delay: 100 },
        },
        actions: [
          {
            id: '',
            target: { type: 'self' },
            animation: {
              type: 'fade_in',
              timing: { duration: 500, easing: 'ease-out' },
            },
          },
        ],
      },
    ],
  },
  {
    id: 'click-bounce',
    name: 'Click Bounce',
    description: 'Element bounces when clicked',
    category: 'animation',
    interactions: [
      {
        name: 'Bounce on Click',
        enabled: true,
        trigger: { type: 'click' },
        actions: [
          {
            id: '',
            target: { type: 'self' },
            animation: {
              type: 'bounce',
              timing: { duration: 400, easing: 'ease-out' },
              params: { intensity: 'normal' },
            },
          },
        ],
      },
    ],
  },
  {
    id: 'click-shake',
    name: 'Click Shake',
    description: 'Element shakes when clicked (great for errors)',
    category: 'animation',
    interactions: [
      {
        name: 'Shake on Click',
        enabled: true,
        trigger: { type: 'click' },
        actions: [
          {
            id: '',
            target: { type: 'self' },
            animation: {
              type: 'shake',
              timing: { duration: 300, easing: 'ease-out' },
              params: { intensity: 'normal' },
            },
          },
        ],
      },
    ],
  },
];

// ============================================
// RUNTIME STATE
// ============================================

export interface InteractionRuntimeState {
  elementId: string;
  toggleStates: Record<string, boolean>;
  triggered: Set<string>;
}

// ============================================
// TRIGGER LABELS (for UI)
// ============================================

export const TRIGGER_LABELS: Record<InteractionTriggerType, string> = {
  click: 'Click',
  hover: 'Hover',
  hover_out: 'Hover Out',
  mouse_enter: 'Mouse Enter',
  mouse_leave: 'Mouse Leave',
  scroll_into_view: 'Scroll Into View',
  scroll_out_of_view: 'Scroll Out of View',
  page_load: 'Page Load',
};

export const ANIMATION_LABELS: Record<AnimationType, string> = {
  show: 'Show',
  hide: 'Hide',
  toggle_visibility: 'Toggle Visibility',
  fade_in: 'Fade In',
  fade_out: 'Fade Out',
  fade_toggle: 'Fade Toggle',
  slide_up: 'Slide Up',
  slide_down: 'Slide Down',
  slide_left: 'Slide Left',
  slide_right: 'Slide Right',
  scale_up: 'Scale Up',
  scale_down: 'Scale Down',
  rotate: 'Rotate',
  bounce: 'Bounce',
  shake: 'Shake',
  pulse: 'Pulse',
  slide_fade_in: 'Slide & Fade In',
  slide_fade_out: 'Slide & Fade Out',
  add_class: 'Add Class',
  remove_class: 'Remove Class',
  toggle_class: 'Toggle Class',
  set_style: 'Set Style',
};

export const TARGET_LABELS: Record<InteractionTargetType, string> = {
  self: 'This Element',
  children: 'Direct Children',
  all_children: 'All Descendants',
  parent: 'Parent Element',
  siblings: 'Sibling Elements',
  specific: 'Specific Element',
};

export const EASING_LABELS: Record<EasingFunction, string> = {
  linear: 'Linear',
  ease: 'Ease',
  'ease-in': 'Ease In',
  'ease-out': 'Ease Out',
  'ease-in-out': 'Ease In Out',
  'cubic-bezier': 'Custom',
};
