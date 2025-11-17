/**
 * Apply real autofix actions for a set of symbolic fix names.
 * Each fix name comes from the rule files (10-to-11, 11-to-12, etc).
 */
export declare function applyAutoFixes(autoFixTargets: string[]): Promise<number>;
