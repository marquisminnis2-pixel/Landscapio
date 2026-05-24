import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element } from '@/types/element.types';
import {
  Interaction,
  InteractionTriggerType,
  AnimationType,
  InteractionTargetType,
  EasingFunction,
  INTERACTION_PRESETS,
  InteractionPreset,
  TRIGGER_LABELS,
  ANIMATION_LABELS,
  TARGET_LABELS,
  EASING_LABELS,
  InteractionAction,
  ToggleState,
} from '@/types/interaction.types';
import { v4 as uuidv4 } from 'uuid';

interface InteractionControlProps {
  element: Element;
}

const InteractionControl = ({ element }: InteractionControlProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const { updateElement } = useBuilderStore();

  const interactions = element.interactions || [];

  const addInteraction = (interaction: Omit<Interaction, 'id'>) => {
    const newInteraction: Interaction = {
      ...interaction,
      id: uuidv4(),
      actions: interaction.actions.map((a) => ({ ...a, id: uuidv4() })),
    };

    const updatedInteractions = [...interactions, newInteraction];
    updateElement(element.id, { interactions: updatedInteractions });
  };

  const updateInteraction = (interactionId: string, updates: Partial<Interaction>) => {
    const updatedInteractions = interactions.map((interaction) =>
      interaction.id === interactionId ? { ...interaction, ...updates } : interaction
    );
    updateElement(element.id, { interactions: updatedInteractions });
  };

  const deleteInteraction = (interactionId: string) => {
    const updatedInteractions = interactions.filter((i) => i.id !== interactionId);
    updateElement(element.id, { interactions: updatedInteractions });
  };

  const applyPreset = (preset: InteractionPreset) => {
    // Add toggle states if present
    if (preset.toggleStates) {
      const newToggleStates: ToggleState[] = preset.toggleStates.map((ts) => ({
        ...ts,
        id: uuidv4(),
      }));
      const existingStates = element.toggleStates || [];
      updateElement(element.id, { toggleStates: [...existingStates, ...newToggleStates] });
    }

    // Add interactions
    const newInteractions: Interaction[] = preset.interactions.map((i) => ({
      ...i,
      id: uuidv4(),
      actions: i.actions.map((a) => ({ ...a, id: uuidv4() })),
      toggle: i.toggle
        ? {
            ...i.toggle,
            onTrue: i.toggle.onTrue.map((a) => ({ ...a, id: uuidv4() })),
            onFalse: i.toggle.onFalse.map((a) => ({ ...a, id: uuidv4() })),
          }
        : undefined,
    }));

    updateElement(element.id, { interactions: [...interactions, ...newInteractions] });
    setSelectedPreset('');
    setShowAddInteraction(false);
  };

  const createCustomInteraction = () => {
    const newInteraction: Interaction = {
      id: uuidv4(),
      name: 'New Interaction',
      enabled: true,
      trigger: { type: 'click' },
      actions: [
        {
          id: uuidv4(),
          target: { type: 'self' },
          animation: {
            type: 'fade_in',
            timing: { duration: 300, easing: 'ease-out' },
          },
        },
      ],
    };
    addInteraction(newInteraction);
    setShowAddInteraction(false);
  };

  return (
    <div className="border-t border-border-color p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">🎬 Interactions</h4>
          {interactions.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-purple-600 text-white rounded">
              {interactions.length}
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
            Add click, hover, and scroll-triggered animations.
          </p>

          {/* Existing Interactions */}
          {interactions.map((interaction) => (
            <InteractionItem
              key={interaction.id}
              interaction={interaction}
              onUpdate={(updates) => updateInteraction(interaction.id, updates)}
              onDelete={() => deleteInteraction(interaction.id)}
            />
          ))}

          {/* Add Interaction */}
          {!showAddInteraction && (
            <button
              onClick={() => setShowAddInteraction(true)}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:opacity-90 text-sm"
            >
              + Add Interaction
            </button>
          )}

          {showAddInteraction && (
            <div className="p-3 bg-canvas-bg rounded space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold">Add Interaction</h5>
                <button
                  onClick={() => setShowAddInteraction(false)}
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
                  {INTERACTION_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} - {preset.description}
                    </option>
                  ))}
                </select>

                {selectedPreset && (
                  <button
                    onClick={() => {
                      const preset = INTERACTION_PRESETS.find((p) => p.id === selectedPreset);
                      if (preset) applyPreset(preset);
                    }}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded hover:opacity-90 text-sm"
                  >
                    Apply Preset
                  </button>
                )}
              </div>

              {/* Custom Interaction */}
              <button
                onClick={createCustomInteraction}
                className="w-full px-3 py-2 bg-panel-bg border border-border-color text-white rounded hover:bg-canvas-bg text-sm"
              >
                Create Custom Interaction
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface InteractionItemProps {
  interaction: Interaction;
  onUpdate: (updates: Partial<Interaction>) => void;
  onDelete: () => void;
}

const InteractionItem = ({ interaction, onUpdate, onDelete }: InteractionItemProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const getTriggerSummary = () => {
    const { trigger } = interaction;
    let summary = TRIGGER_LABELS[trigger.type];

    if (trigger.type === 'scroll_into_view' && trigger.scrollOptions?.once) {
      summary += ' (once)';
    }
    if (trigger.type === 'page_load' && trigger.pageLoadOptions?.delay) {
      summary += ` (${trigger.pageLoadOptions.delay}ms delay)`;
    }

    return summary;
  };

  const getActionsSummary = () => {
    const actions = interaction.toggle ? interaction.toggle.onTrue : interaction.actions;
    if (actions.length === 0) return 'No actions';
    if (actions.length === 1) {
      return `${ANIMATION_LABELS[actions[0].animation.type]} → ${TARGET_LABELS[actions[0].target.type]}`;
    }
    return `${actions.length} actions`;
  };

  const updateAction = (actionIndex: number, updates: Partial<InteractionAction>) => {
    const updatedActions = interaction.actions.map((action, i) =>
      i === actionIndex ? { ...action, ...updates } : action
    );
    onUpdate({ actions: updatedActions });
  };

  return (
    <div className="p-3 bg-canvas-bg rounded border border-border-color">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={interaction.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <input
              type="text"
              value={interaction.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none"
              placeholder="Interaction name"
            />
          </div>
          <p className="text-xs text-text-secondary ml-6">
            {getTriggerSummary()} → {getActionsSummary()}
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
        <div className="ml-6 space-y-3 pt-2 border-t border-border-color">
          {/* Trigger Settings */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Trigger</label>
            <select
              value={interaction.trigger.type}
              onChange={(e) =>
                onUpdate({
                  trigger: { ...interaction.trigger, type: e.target.value as InteractionTriggerType },
                })
              }
              className="w-full text-xs"
            >
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Scroll Options */}
          {(interaction.trigger.type === 'scroll_into_view' ||
            interaction.trigger.type === 'scroll_out_of_view') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={interaction.trigger.scrollOptions?.once || false}
                  onChange={(e) =>
                    onUpdate({
                      trigger: {
                        ...interaction.trigger,
                        scrollOptions: {
                          ...interaction.trigger.scrollOptions,
                          once: e.target.checked,
                        },
                      },
                    })
                  }
                  className="w-4 h-4"
                />
                <label className="text-xs text-text-secondary">Trigger only once</label>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Visibility threshold ({((interaction.trigger.scrollOptions?.threshold || 0.2) * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={interaction.trigger.scrollOptions?.threshold || 0.2}
                  onChange={(e) =>
                    onUpdate({
                      trigger: {
                        ...interaction.trigger,
                        scrollOptions: {
                          ...interaction.trigger.scrollOptions,
                          threshold: parseFloat(e.target.value),
                        },
                      },
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Page Load Options */}
          {interaction.trigger.type === 'page_load' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Delay (ms)</label>
              <input
                type="number"
                value={interaction.trigger.pageLoadOptions?.delay || 0}
                onChange={(e) =>
                  onUpdate({
                    trigger: {
                      ...interaction.trigger,
                      pageLoadOptions: { delay: parseInt(e.target.value) },
                    },
                  })
                }
                className="w-full text-xs"
                min="0"
                step="50"
              />
            </div>
          )}

          {/* Actions */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">Actions</label>
            {interaction.actions.map((action, index) => (
              <ActionEditor
                key={action.id}
                action={action}
                onUpdate={(updates) => updateAction(index, updates)}
                onDelete={() => {
                  const updatedActions = interaction.actions.filter((_, i) => i !== index);
                  onUpdate({ actions: updatedActions });
                }}
              />
            ))}
            <button
              onClick={() => {
                const newAction: InteractionAction = {
                  id: uuidv4(),
                  target: { type: 'self' },
                  animation: {
                    type: 'fade_in',
                    timing: { duration: 300, easing: 'ease-out' },
                  },
                };
                onUpdate({ actions: [...interaction.actions, newAction] });
              }}
              className="w-full px-2 py-1 mt-2 text-xs bg-panel-bg border border-border-color rounded hover:bg-canvas-bg"
            >
              + Add Action
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ActionEditorProps {
  action: InteractionAction;
  onUpdate: (updates: Partial<InteractionAction>) => void;
  onDelete: () => void;
}

const ActionEditor = ({ action, onUpdate, onDelete }: ActionEditorProps) => {
  return (
    <div className="p-2 mb-2 bg-panel-bg rounded border border-border-color">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">Action</span>
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300">
          ✕
        </button>
      </div>

      <div className="space-y-2">
        {/* Target */}
        <div>
          <label className="block text-xs text-text-secondary mb-1">Target</label>
          <select
            value={action.target.type}
            onChange={(e) =>
              onUpdate({
                target: { ...action.target, type: e.target.value as InteractionTargetType },
              })
            }
            className="w-full text-xs"
          >
            {Object.entries(TARGET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Animation Type */}
        <div>
          <label className="block text-xs text-text-secondary mb-1">Animation</label>
          <select
            value={action.animation.type}
            onChange={(e) =>
              onUpdate({
                animation: { ...action.animation, type: e.target.value as AnimationType },
              })
            }
            className="w-full text-xs"
          >
            <optgroup label="Visibility">
              <option value="show">Show</option>
              <option value="hide">Hide</option>
              <option value="toggle_visibility">Toggle Visibility</option>
            </optgroup>
            <optgroup label="Fading">
              <option value="fade_in">Fade In</option>
              <option value="fade_out">Fade Out</option>
            </optgroup>
            <optgroup label="Sliding">
              <option value="slide_up">Slide Up</option>
              <option value="slide_down">Slide Down</option>
              <option value="slide_left">Slide Left</option>
              <option value="slide_right">Slide Right</option>
              <option value="slide_fade_in">Slide & Fade In</option>
              <option value="slide_fade_out">Slide & Fade Out</option>
            </optgroup>
            <optgroup label="Transform">
              <option value="scale_up">Scale Up</option>
              <option value="scale_down">Scale Down</option>
              <option value="rotate">Rotate</option>
            </optgroup>
            <optgroup label="Effects">
              <option value="bounce">Bounce</option>
              <option value="shake">Shake</option>
              <option value="pulse">Pulse</option>
            </optgroup>
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Duration: {action.animation.timing.duration}ms
          </label>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={action.animation.timing.duration}
            onChange={(e) =>
              onUpdate({
                animation: {
                  ...action.animation,
                  timing: { ...action.animation.timing, duration: parseInt(e.target.value) },
                },
              })
            }
            className="w-full"
          />
        </div>

        {/* Delay */}
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Delay: {action.animation.timing.delay || 0}ms
          </label>
          <input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={action.animation.timing.delay || 0}
            onChange={(e) =>
              onUpdate({
                animation: {
                  ...action.animation,
                  timing: { ...action.animation.timing, delay: parseInt(e.target.value) },
                },
              })
            }
            className="w-full"
          />
        </div>

        {/* Easing */}
        <div>
          <label className="block text-xs text-text-secondary mb-1">Easing</label>
          <select
            value={action.animation.timing.easing}
            onChange={(e) =>
              onUpdate({
                animation: {
                  ...action.animation,
                  timing: { ...action.animation.timing, easing: e.target.value as EasingFunction },
                },
              })
            }
            className="w-full text-xs"
          >
            {Object.entries(EASING_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Animation-specific params */}
        {(action.animation.type === 'scale_up' || action.animation.type === 'scale_down') && (
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Scale: {action.animation.params?.scale || 1.05}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={action.animation.params?.scale || 1.05}
              onChange={(e) =>
                onUpdate({
                  animation: {
                    ...action.animation,
                    params: { ...action.animation.params, scale: parseFloat(e.target.value) },
                  },
                })
              }
              className="w-full"
            />
          </div>
        )}

        {action.animation.type === 'rotate' && (
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Degrees: {action.animation.params?.degrees || 360}°
            </label>
            <input
              type="range"
              min="0"
              max="720"
              step="15"
              value={action.animation.params?.degrees || 360}
              onChange={(e) =>
                onUpdate({
                  animation: {
                    ...action.animation,
                    params: { ...action.animation.params, degrees: parseInt(e.target.value) },
                  },
                })
              }
              className="w-full"
            />
          </div>
        )}

        {['slide_up', 'slide_down', 'slide_left', 'slide_right', 'slide_fade_in', 'slide_fade_out'].includes(
          action.animation.type
        ) && (
          <div>
            <label className="block text-xs text-text-secondary mb-1">Distance</label>
            <input
              type="text"
              value={action.animation.params?.distance || '20px'}
              onChange={(e) =>
                onUpdate({
                  animation: {
                    ...action.animation,
                    params: { ...action.animation.params, distance: e.target.value },
                  },
                })
              }
              className="w-full text-xs"
              placeholder="e.g., 20px, 100%"
            />
          </div>
        )}

        {['bounce', 'shake', 'pulse'].includes(action.animation.type) && (
          <div>
            <label className="block text-xs text-text-secondary mb-1">Intensity</label>
            <select
              value={action.animation.params?.intensity || 'normal'}
              onChange={(e) =>
                onUpdate({
                  animation: {
                    ...action.animation,
                    params: {
                      ...action.animation.params,
                      intensity: e.target.value as 'subtle' | 'normal' | 'strong',
                    },
                  },
                })
              }
              className="w-full text-xs"
            >
              <option value="subtle">Subtle</option>
              <option value="normal">Normal</option>
              <option value="strong">Strong</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractionControl;
