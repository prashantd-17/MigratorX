declare const _default: {
    /**
     * Run scanning for Angular 13 → 14 breaking / risky changes (balanced).
     */
    runScanner(): Promise<{
        deprecatedItems: string[];
        autoFixTargets: string[];
    }>;
};
export default _default;
