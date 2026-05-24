/**
 * Behavior Detection Utilities
 *
 * Tracks and analyzes user behavior in real-time
 */

import { UserBehaviorData, ScrollSpeedCategory, HesitationType } from '@/types/behavior.types';

const STORAGE_KEY = 'genesis_visitor_data';
const SCROLL_SPEED_THRESHOLD_FAST = 1000; // pixels per second
const SCROLL_SPEED_THRESHOLD_SLOW = 200; // pixels per second
const AGGRESSIVE_CLICK_THRESHOLD = 5; // clicks within first 10 seconds

/**
 * Get visitor data from localStorage
 */
export const getVisitorData = (): { visitCount: number; lastVisit: number } => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { visitCount: 0, lastVisit: 0 };
    }
  }
  return { visitCount: 0, lastVisit: 0 };
};

/**
 * Update visitor data in localStorage
 */
export const updateVisitorData = (): void => {
  const data = getVisitorData();
  const updatedData = {
    visitCount: data.visitCount + 1,
    lastVisit: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
};

/**
 * Check if user is a returning visitor
 */
export const isReturningVisitor = (): boolean => {
  const data = getVisitorData();
  return data.visitCount > 0;
};

/**
 * Initialize behavior tracking
 */
export const initializeBehaviorTracking = (): UserBehaviorData => {
  const visitorData = getVisitorData();
  const isReturning = visitorData.visitCount > 0;

  // Update visit count
  updateVisitorData();

  return {
    sessionStartTime: Date.now(),
    isReturningVisitor: isReturning,
    visitCount: visitorData.visitCount + 1,
    timeOnPage: 0,
    scrollSpeed: 'medium',
    maxScrollDepth: 0,
    scrollEvents: 0,
    hesitationType: 'neutral',
    mouseMovements: 0,
    clickCount: 0,
    exitIntentDetected: false,
  };
};

/**
 * Calculate scroll speed category
 */
export const calculateScrollSpeed = (
  scrollDistance: number,
  timeDelta: number
): ScrollSpeedCategory => {
  if (timeDelta === 0) return 'medium';

  const pixelsPerSecond = (scrollDistance / timeDelta) * 1000;

  if (pixelsPerSecond > SCROLL_SPEED_THRESHOLD_FAST) {
    return 'fast';
  } else if (pixelsPerSecond < SCROLL_SPEED_THRESHOLD_SLOW) {
    return 'slow';
  }
  return 'medium';
};

/**
 * Calculate scroll depth percentage
 */
export const calculateScrollDepth = (): number => {
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.scrollY;

  const maxScroll = documentHeight - windowHeight;
  if (maxScroll <= 0) return 100;

  const scrollPercent = (scrollTop / maxScroll) * 100;
  return Math.min(Math.round(scrollPercent), 100);
};

/**
 * Determine hesitation type based on behavior
 */
export const determineHesitationType = (
  mouseMovements: number,
  clickCount: number,
  timeOnPage: number
): HesitationType => {
  const timeSinceStart = timeOnPage;

  // Aggressive: Many clicks early, lots of movement
  if (timeSinceStart < 10 && clickCount >= AGGRESSIVE_CLICK_THRESHOLD) {
    return 'aggressive';
  }

  // Hesitant: Low engagement, slow movement
  if (timeSinceStart > 5 && clickCount < 2 && mouseMovements < 50) {
    return 'hesitant';
  }

  return 'neutral';
};

/**
 * Detect exit intent (mouse moving towards top of page)
 */
export const detectExitIntent = (event: MouseEvent): boolean => {
  // If mouse is moving upwards near the top of the page
  return event.clientY < 10 && event.movementY < 0;
};

/**
 * Custom hook-like function to create behavior tracker
 */
export class BehaviorTracker {
  private data: UserBehaviorData;
  private listeners: Array<(data: UserBehaviorData) => void> = [];
  private lastScrollY: number = 0;
  private lastScrollTime: number = Date.now();
  private mouseHoverStart: number | null = null;

  constructor() {
    this.data = initializeBehaviorTracking();
    this.setupListeners();
    this.startTimeTracking();
  }

  /**
   * Subscribe to behavior data updates
   */
  subscribe(callback: (data: UserBehaviorData) => void): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all subscribers of data change
   */
  private notify(): void {
    this.listeners.forEach((callback) => callback(this.data));
  }

  /**
   * Get current behavior data
   */
  getData(): UserBehaviorData {
    return { ...this.data };
  }

  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    // Scroll tracking
    window.addEventListener('scroll', this.handleScroll);

    // Mouse tracking
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseout', this.handleMouseOut);

    // Click tracking
    window.addEventListener('click', this.handleClick);
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseout', this.handleMouseOut);
    window.removeEventListener('click', this.handleClick);
  }

  /**
   * Handle scroll events
   */
  private handleScroll = (): void => {
    const now = Date.now();
    const currentScrollY = window.scrollY;
    const scrollDistance = Math.abs(currentScrollY - this.lastScrollY);
    const timeDelta = now - this.lastScrollTime;

    // Update scroll speed
    if (scrollDistance > 0 && timeDelta > 0) {
      this.data.scrollSpeed = calculateScrollSpeed(scrollDistance, timeDelta);
    }

    // Update scroll depth
    const currentDepth = calculateScrollDepth();
    if (currentDepth > this.data.maxScrollDepth) {
      this.data.maxScrollDepth = currentDepth;
    }

    this.data.scrollEvents++;
    this.lastScrollY = currentScrollY;
    this.lastScrollTime = now;

    this.notify();
  };

  /**
   * Handle mouse movement
   */
  private handleMouseMove = (event: MouseEvent): void => {
    this.data.mouseMovements++;

    // Detect exit intent
    if (detectExitIntent(event)) {
      this.data.exitIntentDetected = true;
      this.notify();
    }

    // Track hovering time
    if (!this.mouseHoverStart) {
      this.mouseHoverStart = Date.now();
    }
  };

  /**
   * Handle mouse leaving viewport
   */
  private handleMouseOut = (event: MouseEvent): void => {
    if (event.relatedTarget === null) {
      this.data.exitIntentDetected = true;
      this.notify();
    }
  };

  /**
   * Handle click events
   */
  private handleClick = (): void => {
    this.data.clickCount++;

    // Update hesitation type
    this.data.hesitationType = determineHesitationType(
      this.data.mouseMovements,
      this.data.clickCount,
      this.data.timeOnPage
    );

    this.notify();
  };

  /**
   * Track time on page
   */
  private startTimeTracking(): void {
    setInterval(() => {
      const elapsed = (Date.now() - this.data.sessionStartTime) / 1000;
      this.data.timeOnPage = Math.floor(elapsed);

      // Re-evaluate hesitation type periodically
      this.data.hesitationType = determineHesitationType(
        this.data.mouseMovements,
        this.data.clickCount,
        this.data.timeOnPage
      );

      this.notify();
    }, 1000); // Update every second
  }
}

/**
 * Global behavior tracker instance
 */
let globalTracker: BehaviorTracker | null = null;

/**
 * Get or create the global behavior tracker
 */
export const getBehaviorTracker = (): BehaviorTracker => {
  if (!globalTracker) {
    globalTracker = new BehaviorTracker();
  }
  return globalTracker;
};

/**
 * Clean up the global tracker
 */
export const cleanupBehaviorTracker = (): void => {
  if (globalTracker) {
    globalTracker.destroy();
    globalTracker = null;
  }
};