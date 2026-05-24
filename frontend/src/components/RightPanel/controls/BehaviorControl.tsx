import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element } from '@/types/element.types';
import {
  BehaviorRule,
  BehaviorTriggerType,
  BEHAVIOR_PRESETS,
  BehaviorPreset,
} from '@/types/behavior.types';
import { v4 as uuidv4 } from 'uuid';
import { useBehaviorData } from '@/hooks/useBehavior';

interface BehaviorControlProps {
  element: Element;
}

const BehaviorControl = ({ element }: BehaviorControlProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const { updateElement } = useBuilderStore();
  const behaviorData = useBehaviorData();

  const rules = element.behaviorRules || [];

  const addRule = (rule: Omit<BehaviorRule, 'id'>) => {
    const newRule: BehaviorRule = {
      ...rule,
      id: uuidv4(),
    };

    const updatedRules = [...rules, newRule];
    updateElement(element.id, { behaviorRules: updatedRules });
  };

  const updateRule = (ruleId: string, updates: Partial<BehaviorRule>) => {
    const updatedRules = rules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    updateElement(element.id, { behaviorRules: updatedRules });
  };

  const deleteRule = (ruleId: string) => {
    const updatedRules = rules.filter((rule) => rule.id !== ruleId);
    updateElement(element.id, { behaviorRules: updatedRules });
  };

  const applyPreset = (preset: BehaviorPreset) => {
    const newRules = preset.rules.map((rule) => ({
      ...rule,
      id: uuidv4(),
    }));
    updateElement(element.id, { behaviorRules: [...rules, ...newRules] });
    setSelectedPreset('');
    setShowAddRule(false);
  };

  const createCustomRule = () => {
    const newRule: BehaviorRule = {
      id: uuidv4(),
      name: 'New Behavior Rule',
      enabled: true,
      condition: {
        type: 'time_on_page',
        timeThreshold: 10,
      },
      action: {
        content: 'Updated content',
      },
    };
    addRule(newRule);
    setShowAddRule(false);
  };

  return (
    <div className="border-t border-border-color p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">⚡ Behavior Rules</h4>
          {rules.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-accent-blue text-white rounded">
              {rules.length}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">
            Make this element react to user behavior in real-time.
          </p>

          {/* Debug Info (only in designer mode) */}
          <div className="p-2 bg-canvas-bg rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-text-secondary">Time on page:</span>
              <span className="font-mono">{behaviorData.timeOnPage}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Scroll speed:</span>
              <span className="font-mono">{behaviorData.scrollSpeed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Visitor:</span>
              <span className="font-mono">
                {behaviorData.isReturningVisitor ? 'returning' : 'new'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Scroll depth:</span>
              <span className="font-mono">{behaviorData.maxScrollDepth}%</span>
            </div>
          </div>

          {/* Existing Rules */}
          {rules.map((rule) => (
            <RuleItem
              key={rule.id}
              rule={rule}
              onUpdate={(updates) => updateRule(rule.id, updates)}
              onDelete={() => deleteRule(rule.id)}
            />
          ))}

          {/* Add Rule */}
          {!showAddRule && (
            <button
              onClick={() => setShowAddRule(true)}
              className="w-full px-3 py-2 bg-accent-blue text-white rounded hover:opacity-90 text-sm"
            >
              + Add Behavior Rule
            </button>
          )}

          {showAddRule && (
            <div className="p-3 bg-canvas-bg rounded space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold">Add Behavior Rule</h5>
                <button
                  onClick={() => setShowAddRule(false)}
                  className="text-text-secondary hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Presets */}
              <div>
                <label className="block text-xs text-text-secondary mb-2">
                  Use a preset or create custom
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="w-full mb-2"
                >
                  <option value="">Select a preset...</option>
                  {BEHAVIOR_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} - {preset.description}
                    </option>
                  ))}
                </select>

                {selectedPreset && (
                  <button
                    onClick={() => {
                      const preset = BEHAVIOR_PRESETS.find((p) => p.id === selectedPreset);
                      if (preset) applyPreset(preset);
                    }}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded hover:opacity-90 text-sm"
                  >
                    Apply Preset
                  </button>
                )}
              </div>

              {/* Custom Rule */}
              <button
                onClick={createCustomRule}
                className="w-full px-3 py-2 bg-panel-bg border border-border-color text-white rounded hover:bg-canvas-bg text-sm"
              >
                Create Custom Rule
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface RuleItemProps {
  rule: BehaviorRule;
  onUpdate: (updates: Partial<BehaviorRule>) => void;
  onDelete: () => void;
}

const RuleItem = ({ rule, onUpdate, onDelete }: RuleItemProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const getTriggerLabel = (type: BehaviorTriggerType): string => {
    const labels: Record<BehaviorTriggerType, string> = {
      time_on_page: 'Time on Page',
      scroll_speed: 'Scroll Speed',
      return_visitor: 'Visitor Type',
      scroll_depth: 'Scroll Depth',
      mouse_hesitation: 'User Hesitation',
      exit_intent: 'Exit Intent',
    };
    return labels[type];
  };

  const getConditionSummary = () => {
    const { condition } = rule;
    switch (condition.type) {
      case 'time_on_page':
        return `After ${condition.timeThreshold}s`;
      case 'scroll_speed':
        return `${condition.scrollSpeed} scrollers`;
      case 'return_visitor':
        return `${condition.visitorType} visitors`;
      case 'scroll_depth':
        return `After ${condition.scrollDepthPercent}% scroll`;
      case 'mouse_hesitation':
        return `${condition.hesitationType} users`;
      case 'exit_intent':
        return 'On exit attempt';
      default:
        return '';
    }
  };

  return (
    <div className="p-3 bg-canvas-bg rounded border border-border-color">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <input
              type="text"
              value={rule.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none"
              placeholder="Rule name"
            />
          </div>
          <p className="text-xs text-text-secondary ml-6">
            {getTriggerLabel(rule.condition.type)}: {getConditionSummary()}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 hover:bg-panel-bg rounded text-xs"
          >
            {isEditing ? '✓' : '✎'}
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-600/20 rounded text-xs text-red-400"
          >
            ✕
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="ml-6 space-y-2 pt-2 border-t border-border-color">
          {/* Condition Settings */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Trigger Type</label>
            <select
              value={rule.condition.type}
              onChange={(e) =>
                onUpdate({
                  condition: { ...rule.condition, type: e.target.value as BehaviorTriggerType },
                })
              }
              className="w-full text-xs"
            >
              <option value="time_on_page">Time on Page</option>
              <option value="scroll_speed">Scroll Speed</option>
              <option value="return_visitor">Visitor Type</option>
              <option value="scroll_depth">Scroll Depth</option>
              <option value="mouse_hesitation">User Hesitation</option>
              <option value="exit_intent">Exit Intent</option>
            </select>
          </div>

          {/* Condition-specific settings */}
          {rule.condition.type === 'time_on_page' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Seconds</label>
              <input
                type="number"
                value={rule.condition.timeThreshold || 10}
                onChange={(e) =>
                  onUpdate({
                    condition: { ...rule.condition, timeThreshold: parseInt(e.target.value) },
                  })
                }
                className="w-full text-xs"
                min="1"
              />
            </div>
          )}

          {rule.condition.type === 'scroll_speed' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Speed</label>
              <select
                value={rule.condition.scrollSpeed || 'medium'}
                onChange={(e) =>
                  onUpdate({
                    condition: {
                      ...rule.condition,
                      scrollSpeed: e.target.value as 'slow' | 'medium' | 'fast',
                    },
                  })
                }
                className="w-full text-xs"
              >
                <option value="slow">Slow</option>
                <option value="medium">Medium</option>
                <option value="fast">Fast</option>
              </select>
            </div>
          )}

          {rule.condition.type === 'return_visitor' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Visitor Type</label>
              <select
                value={rule.condition.visitorType || 'new'}
                onChange={(e) =>
                  onUpdate({
                    condition: {
                      ...rule.condition,
                      visitorType: e.target.value as 'new' | 'returning',
                    },
                  })
                }
                className="w-full text-xs"
              >
                <option value="new">New Visitor</option>
                <option value="returning">Returning Visitor</option>
              </select>
            </div>
          )}

          {rule.condition.type === 'scroll_depth' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Scroll Depth %</label>
              <input
                type="number"
                value={rule.condition.scrollDepthPercent || 50}
                onChange={(e) =>
                  onUpdate({
                    condition: { ...rule.condition, scrollDepthPercent: parseInt(e.target.value) },
                  })
                }
                className="w-full text-xs"
                min="0"
                max="100"
              />
            </div>
          )}

          {rule.condition.type === 'mouse_hesitation' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Hesitation Type</label>
              <select
                value={rule.condition.hesitationType || 'neutral'}
                onChange={(e) =>
                  onUpdate({
                    condition: {
                      ...rule.condition,
                      hesitationType: e.target.value as 'hesitant' | 'aggressive' | 'neutral',
                    },
                  })
                }
                className="w-full text-xs"
              >
                <option value="hesitant">Hesitant</option>
                <option value="neutral">Neutral</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
          )}

          {/* Action Settings */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">New Content</label>
            <textarea
              value={rule.action.content || ''}
              onChange={(e) =>
                onUpdate({
                  action: { ...rule.action, content: e.target.value },
                })
              }
              className="w-full text-xs"
              rows={2}
              placeholder="Content to show when triggered"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Background Color (optional)
            </label>
            <input
              type="color"
              value={rule.action.styles?.backgroundColor || '#3b82f6'}
              onChange={(e) =>
                onUpdate({
                  action: {
                    ...rule.action,
                    styles: { ...rule.action.styles, backgroundColor: e.target.value },
                  },
                })
              }
              className="w-full h-8"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BehaviorControl;