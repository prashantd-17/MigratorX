export interface RuleModule {
    runScanner: () => Promise<{
        deprecatedItems: string[];
        autoFixTargets: string[];
    }>;
}
export declare function getRulesForVersion(fromVersion: number, toVersion: number): Promise<RuleModule>;
