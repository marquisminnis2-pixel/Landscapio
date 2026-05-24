/**
 * Behavior Rules Engine
 *
 * Evaluates behavior rules and determines which actions to apply
 */

import {
  BehaviorRule,
  BehaviorCondition,
  BehaviorAction,
  UserBehaviorData,
} from '@/types/behavior.types';

/**
 * Check if a single condition is met
 */
export const evaluateCondition = (
  condition: BehaviorCondition,
  behaviorData: UserBehaviorData
): boolean => {
  switch (condition.type) {
    case 'time_on_page':
      if (condition.timeThreshold !== undefined) {
        return behaviorData.timeOnPage >= condition.timeThreshold;
      }
      return false;

    case 'scroll_speed':
      if (condition.scrollSpeed) {
        return behaviorData.scrollSpeed === condition.scrollSpeed;
      }
      return false;

    case 'return_visitor':
      if (condition.visitorType === 'returning') {
        return behaviorData.isReturningVisitor;
      } else if (condition.visitorType === 'new') {
        return !behaviorData.isReturningVisitor;
      }
      return false;

    case 'scroll_depth':
      if (condition.scrollDepthPercent !== undefined) {
        return behaviorData.maxScrollDepth >= condition.scrollDepthPercent;
      }
      return false;

    case 'mouse_hesitation':
      if (condition.hesitationType) {
        return behaviorData.hesitationType === condition.hesitationType;
      }
      return false;

    case 'exit_intent':
      return behaviorData.exitIntentDetected;

    default:
      return false;
  }
};

/**
 * Evaluate a behavior rule against current behavior data
 */
export const evaluateRule = (
  rule: BehaviorRule,
  behaviorData: UserBehaviorData
): boolean => {
  if (!rule.enabled) return false;
  return evaluateCondition(rule.condition, behaviorData);
};

/**
 * Get all actions that should be applied based on current behavior
 * Returns the highest priority action for each element
 */
export const getActiveActions = (
  rules: BehaviorRule[],
  behaviorData: UserBehaviorData
): BehaviorAction[] => {
  const activeRules = rules.filter((rule) => evaluateRule(rule, behaviorData));

  // Convert rules to actions
  return activeRules.map((rule) => rule.action);
};

/**
 * Merge multiple actions into a single action
 * Later actions override earlier ones
 */
export const mergeActions = (actions: BehaviorAction[]): BehaviorAction | null => {
  if (actions.length === 0) return null;

  return actions.reduce((merged, action) => {
    return {
      content: action.content ?? merged.content,
      styles: { ...merged.styles, ...action.styles },
      attributes: { ...merged.attributes, ...action.attributes },
      visibility: action.visibility ?? merged.visibility,
    };
  }, {} as BehaviorAction);
};

/**
 * Get the final action to apply for an element
 */
export const getActiveActionForElement = (
  rules: BehaviorRule[],
  behaviorData: UserBehaviorData
): BehaviorAction | null => {
  const activeActions = getActiveActions(rules, behaviorData);
  return mergeActions(activeActions);
};

/**
 * Priority system for conflicting rules
 * Higher priority conditions take precedence
 */
const CONDITION_PRIORITY = {
  exit_intent: 100,
  time_on_page: 90,
  scroll_depth: 80,
  mouse_hesitation: 70,
  scroll_speed: 60,
  return_visitor: 50,
};

/**
 * Sort rules by priority (highest first)
 */
export const sortRulesByPriority = (rules: BehaviorRule[]): BehaviorRule[] => {
  return [...rules].sort((a, b) => {
    const priorityA = CONDITION_PRIORITY[a.condition.type] || 0;
    const priorityB = CONDITION_PRIORITY[b.condition.type] || 0;
    return priorityB - priorityA;
  });
};

/**
 * Get the single highest priority active action
 */
export const getHighestPriorityAction = (
  rules: BehaviorRule[],
  behaviorData: UserBehaviorData
): BehaviorAction | null => {
  const sortedRules = sortRulesByPriority(rules);

  for (const rule of sortedRules) {
    if (evaluateRule(rule, behaviorData)) {
      return rule.action;
    }
  }

  return null;
};

/**
 * Debug helper to explain why rules are/aren't triggered
 */
export const debugRules = (
  rules: BehaviorRule[],
  behaviorData: UserBehaviorData
): { rule: BehaviorRule; active: boolean; reason: string }[] => {
  return rules.map((rule) => {
    if (!rule.enabled) {
      return { rule, active: false, reason: 'Rule is disabled' };
    }

    const { condition } = rule;
    let reason = '';

    switch (condition.type) {
      case 'time_on_page':
        reason = `Time on page: ${behaviorData.timeOnPage}s / ${condition.timeThreshold}s required`;
        break;
      case 'scroll_speed':
        reason = `Scroll speed: ${behaviorData.scrollSpeed} / ${condition.scrollSpeed} required`;
        break;
      case 'return_visitor':
        reason = `Visitor type: ${behaviorData.isReturningVisitor ? 'returning' : 'new'} / ${condition.visitorType} required`;
        break;
      case 'scroll_depth':
        reason = `Scroll depth: ${behaviorData.maxScrollDepth}% / ${condition.scrollDepthPercent}% required`;
        break;
      case 'mouse_hesitation':
        reason = `Hesitation: ${behaviorData.hesitationType} / ${condition.hesitationType} required`;
        break;
      case 'exit_intent':
        reason = `Exit intent: ${behaviorData.exitIntentDetected ? 'detected' : 'not detected'}`;
        break;
    }

    const active = evaluateRule(rule, behaviorData);
    return { rule, active, reason };
  });
};