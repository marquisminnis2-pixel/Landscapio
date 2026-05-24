/**
 * Behavior-Aware UI Types
 *
 * This system allows elements to react dynamically based on user behavior
 */

export type BehaviorTriggerType =
  | 'time_on_page'      // After X seconds on page
  | 'scroll_speed'      // Fast vs slow scrolling
  | 'return_visitor'    // Returning vs new visitor
  | 'scroll_depth'      // Scrolled past certain percentage
  | 'mouse_hesitation'  // User hovering/hesitating
  | 'exit_intent';      // Mouse moving towards browser close

export type ScrollSpeedCategory = 'slow' | 'medium' | 'fast';
export type VisitorType = 'new' | 'returning';
export type HesitationType = 'hesitant' | 'aggressive' | 'neutral';

/**
 * Condition for a behavior rule
 */
export interface BehaviorCondition {
  type: BehaviorTriggerType;

  // For time_on_page
  timeThreshold?: number; // seconds

  // For scroll_speed
  scrollSpeed?: ScrollSpeedCategory;

  // For return_visitor
  visitorType?: VisitorType;

  // For scroll_depth
  scrollDepthPercent?: number; // 0-100

  // For mouse_hesitation
  hesitationType?: HesitationType;
}

/**
 * What changes when a condition is met
 */
export interface BehaviorAction {
  // Content changes
  content?: string;

  // Style changes
  styles?: {
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    [key: string]: string | undefined;
  };

  // Attribute changes
  attributes?: {
    href?: string;
    [key: string]: string | undefined;
  };

  // Show/hide element
  visibility?: 'visible' | 'hidden';
}

/**
 * A complete behavior rule
 */
export interface BehaviorRule {
  id: string;
  name: string; // User-friendly name like "Show CTA after 20s"
  condition: BehaviorCondition;
  action: BehaviorAction;
  enabled: boolean;
}

/**
 * User behavior data tracked during session
 */
export interface UserBehaviorData {
  // Session info
  sessionStartTime: number;
  isReturningVisitor: boolean;
  visitCount: number;

  // Time tracking
  timeOnPage: number; // seconds

  // Scroll tracking
  scrollSpeed: ScrollSpeedCategory;
  maxScrollDepth: number; // percentage 0-100
  scrollEvents: number;

  // Interaction tracking
  hesitationType: HesitationType;
  mouseMovements: number;
  clickCount: number;

  // Exit intent
  exitIntentDetected: boolean;
}

/**
 * Preset behavior rules for quick setup
 */
export interface BehaviorPreset {
  id: string;
  name: string;
  description: string;
  category: 'engagement' | 'conversion' | 'retention';
  rules: Omit<BehaviorRule, 'id'>[];
}

export const BEHAVIOR_PRESETS: BehaviorPreset[] = [
  {
    id: 'cta-after-engagement',
    name: 'CTA After Engagement',
    description: 'Show stronger CTA after user engages with content',
    category: 'conversion',
    rules: [
      {
        name: 'CTA text change after 20s',
        condition: { type: 'time_on_page', timeThreshold: 20 },
        action: { content: 'Ready to get started? Book now!' },
        enabled: true,
      },
    ],
  },
  {
    id: 'scroll-based-messaging',
    name: 'Scroll-Based Messaging',
    description: 'Different messages based on scroll behavior',
    category: 'engagement',
    rules: [
      {
        name: 'Fast scrollers get quick summary',
        condition: { type: 'scroll_speed', scrollSpeed: 'fast' },
        action: { content: 'Quick summary: Get results in 24 hours' },
        enabled: true,
      },
      {
        name: 'Slow scrollers get detailed copy',
        condition: { type: 'scroll_speed', scrollSpeed: 'slow' },
        action: { content: 'Take your time exploring our comprehensive features...' },
        enabled: true,
      },
    ],
  },
  {
    id: 'returning-visitor-welcome',
    name: 'Returning Visitor Welcome',
    description: 'Welcome back returning visitors',
    category: 'retention',
    rules: [
      {
        name: 'Welcome back message',
        condition: { type: 'return_visitor', visitorType: 'returning' },
        action: { content: 'Welcome back! Ready to continue?' },
        enabled: true,
      },
    ],
  },
  {
    id: 'hesitation-reassurance',
    name: 'Hesitation Reassurance',
    description: 'Reassure hesitant users',
    category: 'conversion',
    rules: [
      {
        name: 'Show reassurance for hesitant users',
        condition: { type: 'mouse_hesitation', hesitationType: 'hesitant' },
        action: { content: 'No commitment required • Free trial • Cancel anytime' },
        enabled: true,
      },
      {
        name: 'Fast CTA for aggressive users',
        condition: { type: 'mouse_hesitation', hesitationType: 'aggressive' },
        action: { content: 'Book Now →', styles: { backgroundColor: '#ef4444' } },
        enabled: true,
      },
    ],
  },
  {
    id: 'deep-scroll-engagement',
    name: 'Deep Scroll Engagement',
    description: 'Reward users who scroll deeply',
    category: 'engagement',
    rules: [
      {
        name: 'Show special offer after 75% scroll',
        condition: { type: 'scroll_depth', scrollDepthPercent: 75 },
        action: {
          content: '🎉 You made it! Special offer: 20% off',
          styles: { backgroundColor: '#10b981', color: '#ffffff' }
        },
        enabled: true,
      },
    ],
  },
  {
    id: 'exit-intent-save',
    name: 'Exit Intent Save',
    description: 'Last chance offer when user tries to leave',
    category: 'conversion',
    rules: [
      {
        name: 'Show exit offer',
        condition: { type: 'exit_intent' },
        action: {
          content: 'Wait! Get 15% off before you go',
          styles: { backgroundColor: '#ef4444', fontSize: '20px' }
        },
        enabled: true,
      },
    ],
  },
];