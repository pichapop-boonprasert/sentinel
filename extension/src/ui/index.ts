/**
 * UI components for Kiro IDE integration
 * 
 * Exports all UI components for the Data Masking Suggestion Plugin.
 */

// Suggestion Panel
export {
  SuggestionPanel,
  createSuggestionPanel,
  SortOption,
  SortDirection,
  PanelConfig,
  PanelEventType,
  PanelEvent,
  PanelEventListener,
  GroupedSuggestions,
} from './suggestion-panel';

// Inline Highlighter
export {
  InlineHighlighter,
  createInlineHighlighter,
  DecorationStyle,
  DecorationRange,
  DEFAULT_STYLES,
} from './inline-highlighter';

// Tooltip Provider
export {
  TooltipProvider,
  createTooltipProvider,
  TooltipContent,
  TooltipSection,
  TooltipAction,
} from './tooltip-provider';

// Progress Indicator
export {
  ProgressIndicator,
  createProgressIndicator,
  ProgressState,
  ProgressInfo,
  StatusBarConfig,
  ProgressListener,
} from './progress-indicator';
