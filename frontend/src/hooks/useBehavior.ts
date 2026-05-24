/**
 * useBehavior Hook
 *
 * React hook for accessing user behavior data and applying behavior rules
 */

import { useState, useEffect } from 'react';
import { BehaviorRule, UserBehaviorData } from '@/types/behavior.types';
import { getBehaviorTracker } from '@/utils/behaviorDetection';
import { getHighestPriorityAction } from '@/utils/behaviorRulesEngine';
import { Element } from '@/types/element.types';

/**
 * Hook to get current user behavior data
 */
export const useBehaviorData = (): UserBehaviorData => {
  const [behaviorData, setBehaviorData] = useState<UserBehaviorData>(() => {
    return getBehaviorTracker().getData();
  });

  useEffect(() => {
    const tracker = getBehaviorTracker();

    // Subscribe to behavior updates
    const unsubscribe = tracker.subscribe((data) => {
      setBehaviorData(data);
    });

    return unsubscribe;
  }, []);

  return behaviorData;
};

/**
 * Hook to get active behavior modifications for an element
 */
export const useBehaviorModifications = (element: Element) => {
  const behaviorData = useBehaviorData();

  const [modifications, setModifications] = useState<{
    content?: string;
    styles?: React.CSSProperties;
    attributes?: Record<string, string | undefined>;
    isVisible: boolean;
  }>({
    content: undefined,
    styles: undefined,
    attributes: undefined,
    isVisible: true,
  });

  useEffect(() => {
    if (!element.behaviorRules || element.behaviorRules.length === 0) {
      setModifications({
        content: undefined,
        styles: undefined,
        attributes: undefined,
        isVisible: true,
      });
      return;
    }

    // Get the highest priority action that should be applied
    const action = getHighestPriorityAction(element.behaviorRules, behaviorData);

    if (!action) {
      setModifications({
        content: undefined,
        styles: undefined,
        attributes: undefined,
        isVisible: true,
      });
      return;
    }

    setModifications({
      content: action.content,
      styles: action.styles as React.CSSProperties,
      attributes: action.attributes,
      isVisible: action.visibility !== 'hidden',
    });
  }, [element.behaviorRules, behaviorData]);

  return modifications;
};

/**
 * Hook to check if a specific rule is active
 */
export const useIsRuleActive = (rule: BehaviorRule | undefined): boolean => {
  const behaviorData = useBehaviorData();

  if (!rule || !rule.enabled) return false;

  const action = getHighestPriorityAction([rule], behaviorData);
  return action !== null;
};

/**
 * Hook to get debug info about active rules
 */
export const useBehaviorDebug = (rules: BehaviorRule[] = []) => {
  const behaviorData = useBehaviorData();

  return {
    behaviorData,
    activeRules: rules.filter((rule) => {
      const action = getHighestPriorityAction([rule], behaviorData);
      return action !== null;
    }),
  };
};