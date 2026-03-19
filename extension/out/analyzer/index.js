"use strict";
/**
 * Analyzer component for sensitive data detection
 *
 * This module provides pattern matching and analysis capabilities
 * for detecting sensitive data fields in source code.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Export pattern definitions
__exportStar(require("./patterns"), exports);
// Export pattern matcher
__exportStar(require("./pattern-matcher"), exports);
// Export confidence scorer
__exportStar(require("./confidence-scorer"), exports);
// Export usage context analyzer
__exportStar(require("./usage-context-analyzer"), exports);
// Export feedback recorder
__exportStar(require("./feedback-recorder"), exports);
//# sourceMappingURL=index.js.map