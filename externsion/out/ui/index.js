"use strict";
/**
 * UI components for Kiro IDE integration
 *
 * Exports all UI components for the Data Masking Suggestion Plugin.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgressIndicator = exports.ProgressIndicator = exports.createTooltipProvider = exports.TooltipProvider = exports.DEFAULT_STYLES = exports.createInlineHighlighter = exports.InlineHighlighter = exports.createSuggestionPanel = exports.SuggestionPanel = void 0;
// Suggestion Panel
var suggestion_panel_1 = require("./suggestion-panel");
Object.defineProperty(exports, "SuggestionPanel", { enumerable: true, get: function () { return suggestion_panel_1.SuggestionPanel; } });
Object.defineProperty(exports, "createSuggestionPanel", { enumerable: true, get: function () { return suggestion_panel_1.createSuggestionPanel; } });
// Inline Highlighter
var inline_highlighter_1 = require("./inline-highlighter");
Object.defineProperty(exports, "InlineHighlighter", { enumerable: true, get: function () { return inline_highlighter_1.InlineHighlighter; } });
Object.defineProperty(exports, "createInlineHighlighter", { enumerable: true, get: function () { return inline_highlighter_1.createInlineHighlighter; } });
Object.defineProperty(exports, "DEFAULT_STYLES", { enumerable: true, get: function () { return inline_highlighter_1.DEFAULT_STYLES; } });
// Tooltip Provider
var tooltip_provider_1 = require("./tooltip-provider");
Object.defineProperty(exports, "TooltipProvider", { enumerable: true, get: function () { return tooltip_provider_1.TooltipProvider; } });
Object.defineProperty(exports, "createTooltipProvider", { enumerable: true, get: function () { return tooltip_provider_1.createTooltipProvider; } });
// Progress Indicator
var progress_indicator_1 = require("./progress-indicator");
Object.defineProperty(exports, "ProgressIndicator", { enumerable: true, get: function () { return progress_indicator_1.ProgressIndicator; } });
Object.defineProperty(exports, "createProgressIndicator", { enumerable: true, get: function () { return progress_indicator_1.createProgressIndicator; } });
//# sourceMappingURL=index.js.map