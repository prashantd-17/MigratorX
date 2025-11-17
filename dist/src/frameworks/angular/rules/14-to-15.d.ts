declare const _default: {
    /**
     * Scan for Angular 14 → 15 breaking/risky changes
     */
    runScanner(): Promise<{
        deprecatedItems: string[];
        autoFixTargets: string[];
    }>;
};
export default _default;
