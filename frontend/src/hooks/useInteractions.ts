/**
 * useInteractions Hook
 *
 * Manages interaction runtime state and provides event handlers
 * for preview/build mode
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Element } from '@/types/element.types';
import {
  Interaction,
  InteractionRuntimeState,
  InteractionAction,
  InteractionTarget,
  ToggleState,
} from '@/types/interaction.types';
import { executeAnimationAsync, prepareElementForAnimation } from '@/utils/animationUtils';

/**
 * Initialize toggle states from element definition
 */
const initializeToggleStates = (toggleStates: ToggleState[]): Record<string, boolean> => {
  const states: Record<string, boolean> = {};
  toggleStates.forEach((ts) => {
    states[ts.id] = ts.initialState;
  });
  return states;
};

/**
 * Find target elements based on target type
 */
const getTargetElements = (
  sourceElement: HTMLElement,
  target: InteractionTarget,
  allElements: Map<string, HTMLElement>
): HTMLElement[] => {
  switch (target.type) {
    case 'self':
      return [sourceElement];

    case 'children':
      return Array.from(sourceElement.children) as HTMLElement[];

    case 'all_children':
      return Array.from(sourceElement.querySelectorAll('*')) as HTMLElement[];

    case 'parent':
      return sourceElement.parentElement ? [sourceElement.parentElement] : [];

    case 'siblings':
      if (!sourceElement.parentElement) return [];
      return Array.from(sourceElement.parentElement.children).filter(
        (el) => el !== sourceElement
      ) as HTMLElement[];

    case 'specific':
      if (target.elementId) {
        const el = allElements.get(target.elementId);
        return el ? [el] : [];
      }
      return [];

    default:
      return [];
  }
};

/**
 * Execute interaction actions
 */
const executeActions = async (
  actions: InteractionAction[],
  sourceElement: HTMLElement,
  allElements: Map<string, HTMLElement>
): Promise<void> => {
  for (const action of actions) {
    const targets = getTargetElements(sourceElement, action.target, allElements);

    if (action.afterPrevious) {
      // Sequential execution
      for (const target of targets) {
        await executeAnimationAsync(target, action.animation);
      }
    } else {
      // Parallel execution
      await Promise.all(targets.map((target) => executeAnimationAsync(target, action.animation)));
    }
  }
};

/**
 * Main hook for handling interactions
 */
export const useInteractionHandlers = (element: Element, elementRef: React.RefObject<HTMLElement>) => {
  const [runtimeState, setRuntimeState] = useState<InteractionRuntimeState>(() => ({
    elementId: element.id,
    toggleStates: initializeToggleStates(element.toggleStates || []),
    triggered: new Set(),
  }));

  const [isAnimating, setIsAnimating] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const allElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Update element map for targeting
  useEffect(() => {
    // Build a map of all elements on the page
    const elements = document.querySelectorAll('[data-element-id]');
    const map = new Map<string, HTMLElement>();
    elements.forEach((el) => {
      const id = el.getAttribute('data-element-id');
      if (id) {
        map.set(id, el as HTMLElement);
      }
    });
    allElementsRef.current = map;
  }, []);

  /**
   * Execute an interaction
   */
  const executeInteraction = useCallback(
    async (interaction: Interaction) => {
      if (!interaction.enabled || !elementRef.current) return;

      // Check onlyOnce
      if (interaction.options?.onlyOnce && runtimeState.triggered.has(interaction.id)) {
        return;
      }

      setIsAnimating(true);

      try {
        // Handle toggle interactions
        if (interaction.toggle) {
          const currentState = runtimeState.toggleStates[interaction.toggle.stateId] || false;
          const newState = !currentState;

          // Update state
          setRuntimeState((prev) => ({
            ...prev,
            toggleStates: {
              ...prev.toggleStates,
              [interaction.toggle!.stateId]: newState,
            },
          }));

          // Execute appropriate actions
          const actions = newState ? interaction.toggle.onTrue : interaction.toggle.onFalse;
          await executeActions(actions, elementRef.current, allElementsRef.current);
        } else {
          // Execute regular actions
          await executeActions(interaction.actions, elementRef.current, allElementsRef.current);
        }

        // Mark as triggered
        if (interaction.options?.onlyOnce) {
          setRuntimeState((prev) => ({
            ...prev,
            triggered: new Set([...prev.triggered, interaction.id]),
          }));
        }
      } finally {
        setIsAnimating(false);
      }
    },
    [elementRef, runtimeState.toggleStates, runtimeState.triggered]
  );

  /**
   * Click handler
   */
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      const clickInteractions = (element.interactions || []).filter(
        (i) => i.enabled && i.trigger.type === 'click'
      );

      clickInteractions.forEach((interaction) => {
        if (interaction.options?.preventDefault) {
          e.preventDefault();
        }
        if (interaction.options?.stopPropagation) {
          e.stopPropagation();
        }
        executeInteraction(interaction);
      });
    },
    [element.interactions, executeInteraction]
  );

  /**
   * Mouse enter handler
   */
  const onMouseEnter = useCallback(
    (_e: React.MouseEvent) => {
      const hoverInteractions = (element.interactions || []).filter(
        (i) => i.enabled && (i.trigger.type === 'hover' || i.trigger.type === 'mouse_enter')
      );

      hoverInteractions.forEach((interaction) => {
        executeInteraction(interaction);
      });
    },
    [element.interactions, executeInteraction]
  );

  /**
   * Mouse leave handler
   */
  const onMouseLeave = useCallback(
    (_e: React.MouseEvent) => {
      const leaveInteractions = (element.interactions || []).filter(
        (i) => i.enabled && (i.trigger.type === 'hover_out' || i.trigger.type === 'mouse_leave')
      );

      leaveInteractions.forEach((interaction) => {
        executeInteraction(interaction);
      });
    },
    [element.interactions, executeInteraction]
  );

  /**
   * Setup scroll observers
   */
  useEffect(() => {
    if (!elementRef.current) return;

    const scrollInteractions = (element.interactions || []).filter(
      (i) => i.enabled && (i.trigger.type === 'scroll_into_view' || i.trigger.type === 'scroll_out_of_view')
    );

    if (scrollInteractions.length === 0) return;

    // Prepare elements for scroll animations (start hidden)
    scrollInteractions.forEach((interaction) => {
      if (interaction.trigger.type === 'scroll_into_view' && elementRef.current) {
        interaction.actions.forEach((action) => {
          if (action.target.type === 'self') {
            prepareElementForAnimation(elementRef.current!, action.animation.type);
          }
        });
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          scrollInteractions.forEach((interaction) => {
            const isEntering = entry.isIntersecting;
            const shouldTrigger =
              (interaction.trigger.type === 'scroll_into_view' && isEntering) ||
              (interaction.trigger.type === 'scroll_out_of_view' && !isEntering);

            if (shouldTrigger) {
              // Check if already triggered (for once option)
              if (interaction.trigger.scrollOptions?.once && runtimeState.triggered.has(interaction.id)) {
                return;
              }

              executeInteraction(interaction);

              // Unobserve if once
              if (interaction.trigger.scrollOptions?.once && elementRef.current) {
                observer.unobserve(elementRef.current);
              }
            }
          });
        });
      },
      {
        threshold: scrollInteractions[0]?.trigger.scrollOptions?.threshold || 0.2,
      }
    );

    observer.observe(elementRef.current);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [element.interactions, elementRef, executeInteraction, runtimeState.triggered]);

  /**
   * Handle page load triggers
   */
  useEffect(() => {
    const pageLoadInteractions = (element.interactions || []).filter(
      (i) => i.enabled && i.trigger.type === 'page_load'
    );

    pageLoadInteractions.forEach((interaction) => {
      const delay = interaction.trigger.pageLoadOptions?.delay || 0;

      // Prepare element for animation
      if (elementRef.current) {
        interaction.actions.forEach((action) => {
          if (action.target.type === 'self') {
            prepareElementForAnimation(elementRef.current!, action.animation.type);
          }
        });
      }

      setTimeout(() => {
        executeInteraction(interaction);
      }, delay);
    });
  }, []); // Only run once on mount

  return {
    handlers: {
      onClick,
      onMouseEnter,
      onMouseLeave,
    },
    runtimeState,
    isAnimating,
    executeInteraction,
  };
};

/**
 * Check if an element has any interactions
 */
export const hasInteractions = (element: Element): boolean => {
  return (element.interactions?.length || 0) > 0;
};

/**
 * Get interaction summary for display
 */
export const getInteractionSummary = (element: Element): string => {
  const count = element.interactions?.length || 0;
  if (count === 0) return '';
  if (count === 1) return '1 interaction';
  return `${count} interactions`;
};
