declare const _default: {
    /**
     * Detect deprecated / risky patterns when migrating Angular 11 → 12.
     * This is ANALYSIS ONLY. No code changes here.
     */
    runScanner(): Promise<{
        deprecatedItems: string[];
        autoFixTargets: string[];
    }>;
};
export default _default;
