declare const _default: {
    /**
     * Detect deprecated APIs & identify possible autofix targets
     */
    runScanner(): Promise<{
        deprecatedItems: string[];
        autoFixTargets: string[];
    }>;
};
export default _default;
