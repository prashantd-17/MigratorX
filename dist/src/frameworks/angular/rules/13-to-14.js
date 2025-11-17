import fs from "fs-extra";
import path from "path";
export default {
    /**
     * Run scanning for Angular 13 → 14 breaking / risky changes (balanced).
     */
    async runScanner() {
        const root = process.cwd();
        const deprecatedItems = [];
        const autoFixTargets = [];
        /**
         * 1) entryComponents — still a bad sign in later versions
         *    (keep checking & offering removal)
         */
        const entryCompHits = scanAllFiles(/entryComponents\s*:/g);
        if (entryCompHits.length) {
            deprecatedItems.push(...entryCompHits.map(f => `entryComponents still used → ${f}`));
            autoFixTargets.push("entryComponentsFix");
        }
        /**
         * 2) ViewEngine remnants: enableIvy:false (should not exist in 13+)
         */
        const ivyHits = scanAllFiles(/enableIvy\s*:\s*false/g);
        if (ivyHits.length) {
            deprecatedItems.push(...ivyHits.map(f => `ViewEngine / enableIvy:false still present → ${f}`));
            autoFixTargets.push("forceIvyFix");
        }
        /**
         * 3) rxjs-compat usage — strongly discouraged with modern Angular
         */
        const rxjsCompatHits = scanAllFiles(/rxjs-compat/g);
        if (rxjsCompatHits.length) {
            deprecatedItems.push(...rxjsCompatHits.map(f => `rxjs-compat usage detected (RxJS 7 recommended, remove compat) → ${f}`));
            autoFixTargets.push("rxjsCompatRemovalReview");
        }
        /**
         * 4) ModuleWithProviders without generic type (old migration leftover)
         *    This isn't a hard break at 14 if already migrated, but good to flag.
         */
        const moduleWithProvidersHits = scanAllFiles(/ModuleWithProviders\s*(?!<)/g);
        if (moduleWithProvidersHits.length) {
            deprecatedItems.push(...moduleWithProvidersHits.map(f => `ModuleWithProviders without generic type detected (consider typing) → ${f}`));
            autoFixTargets.push("moduleWithProvidersGenericReview");
        }
        /**
         * 5) tsconfig target still "es5" — too old / inefficient for v14+
         */
        const tsTargetHits = detectLegacyTsTarget(root);
        if (tsTargetHits.length) {
            deprecatedItems.push(...tsTargetHits.map(f => `tsconfig target "es5" → modernize recommended → ${f}`));
            autoFixTargets.push("tsTargetModernize");
        }
        /**
         * 6) Old HttpModule (@angular/http) still present — very legacy
         */
        const httpModuleHits = scanAllFiles(/HttpModule/g);
        if (httpModuleHits.length) {
            deprecatedItems.push(...httpModuleHits.map(f => `HttpModule detected (use HttpClientModule instead) → ${f}`));
            autoFixTargets.push("httpModuleFix");
        }
        return { deprecatedItems, autoFixTargets };
        // --------- helpers ----------
        function scanAllFiles(pattern) {
            const results = [];
            traverse(root);
            return results;
            function traverse(dir) {
                const entries = fs.readdirSync(dir);
                for (const entry of entries) {
                    const full = path.join(dir, entry);
                    const stat = fs.statSync(full);
                    if (stat.isDirectory()) {
                        if (full.includes("node_modules") ||
                            full.includes("dist") ||
                            full.includes("build") ||
                            full.includes("out-tsc")) {
                            continue;
                        }
                        traverse(full);
                    }
                    else if (entry.endsWith(".ts") ||
                        entry.endsWith(".json")) {
                        const content = fs.readFileSync(full, "utf8");
                        if (pattern.test(content)) {
                            results.push(full);
                        }
                    }
                }
            }
        }
        function detectLegacyTsTarget(projectRoot) {
            const results = [];
            const files = ["tsconfig.json", "tsconfig.app.json", "tsconfig.browser.json"];
            for (const f of files) {
                const full = path.join(projectRoot, f);
                if (!fs.existsSync(full))
                    continue;
                try {
                    const json = fs.readJSONSync(full);
                    if (json?.compilerOptions?.target === "es5") {
                        results.push(full);
                    }
                }
                catch {
                    // ignore parse errors
                }
            }
            return results;
        }
    }
};
