declare const _default: {
    /**
     * Scan for Angular 15 → 16 breaking/risky changes (balanced).
     * Uses existing autofix targets where safe; the rest are review-only.
     */
    runScanner(): Promise<{
        deprecatedItems: string[];
        autoFixTargets: string[];
    }>;
};
export default _default;
