declare const _default: {
    /**
     * Run scanning for Angular 12 → 13 breaking changes (balanced mode)
     */
    runScanner(): Promise<{
        deprecatedItems: string[];
        autoFixTargets: string[];
    }>;
};
export default _default;
