import fs from "fs-extra";
import path from "path";
export default {
    /**
     * Detect deprecated / risky patterns when migrating Angular 11 → 12.
     * This is ANALYSIS ONLY. No code changes here.
     */
    async runScanner() {
        const projectRoot = process.cwd();
        const deprecatedItems = [];
        const autoFixTargets = [];
        // 1) IE11 support in browserslist / .browserslistrc / package.json
        const browserslistFindings = detectIE11Support(projectRoot);
        if (browserslistFindings.length) {
            deprecatedItems.push(...browserslistFindings.map(f => `IE11 is still targeted in browserslist → ${f}`));
            autoFixTargets.push("ie11BrowserslistCleanup");
        }
        // 2) enableIvy:false (ViewEngine-style configuration)
        const ivyHits = scanAllFiles(projectRoot, /enableIvy\s*:\s*false/g, [
            ".json",
            ".ts"
        ]);
        if (ivyHits.length) {
            deprecatedItems.push(...ivyHits.map(f => `ViewEngine / enableIvy:false usage detected → ${f}`));
            autoFixTargets.push("forceIvyFix");
        }
        // 3) ES5 / legacy target in tsconfig (not strictly breaking but risky)
        const tsconfigHits = detectEs5Target(projectRoot);
        if (tsconfigHits.length) {
            deprecatedItems.push(...tsconfigHits.map(f => `TypeScript target "es5" detected (consider modern target) → ${f}`));
            autoFixTargets.push("tsTargetModernize");
        }
        // 4) CommonJS-style require() usage (Angular CLI warns)
        const commonJsHits = scanAllFiles(projectRoot, /\brequire\(/g, [".ts"]);
        if (commonJsHits.length) {
            deprecatedItems.push(...commonJsHits.map(f => `CommonJS-style "require()" detected (may cause Angular CLI warnings) → ${f}`));
            autoFixTargets.push("commonJsUsageReview");
        }
        return { deprecatedItems, autoFixTargets };
    }
};
/**
 * Recursively scan project files for a pattern.
 * Limits by extensions to avoid scanning node_modules, build output, etc.
 */
function scanAllFiles(root, pattern, exts = [".ts", ".json"]) {
    const matches = [];
    traverse(root);
    return matches;
    function traverse(dir) {
        const entries = fs.readdirSync(dir);
        for (const file of entries) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                // Skip node_modules and dist/build folders
                if (fullPath.includes("node_modules") ||
                    fullPath.includes("dist") ||
                    fullPath.includes("build") ||
                    fullPath.includes("out-tsc")) {
                    continue;
                }
                traverse(fullPath);
            }
            else {
                // Extension filter
                if (!exts.some(ext => file.endsWith(ext)))
                    continue;
                try {
                    const content = fs.readFileSync(fullPath, "utf8");
                    if (pattern.test(content)) {
                        matches.push(fullPath);
                    }
                }
                catch {
                    // Ignore unreadable files
                }
            }
        }
    }
}
/**
 * Detect IE11 in browserslist configs and package.json "browserslist".
 */
function detectIE11Support(projectRoot) {
    const results = [];
    // 1) .browserslistrc
    const browserslistRc = path.join(projectRoot, ".browserslistrc");
    if (fs.existsSync(browserslistRc)) {
        const content = fs.readFileSync(browserslistRc, "utf8");
        if (/ie\s*11/i.test(content)) {
            results.push(".browserslistrc");
        }
    }
    // 2) browserslist file
    const browserslistFile = path.join(projectRoot, "browserslist");
    if (fs.existsSync(browserslistFile)) {
        const content = fs.readFileSync(browserslistFile, "utf8");
        if (/ie\s*11/i.test(content)) {
            results.push("browserslist");
        }
    }
    // 3) package.json "browserslist"
    const packageJsonPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(packageJsonPath)) {
        try {
            const pkg = fs.readJSONSync(packageJsonPath);
            const browserslist = pkg.browserslist;
            if (Array.isArray(browserslist)) {
                const hasIE11 = browserslist.some((entry) => /ie\s*11/i.test(entry));
                if (hasIE11) {
                    results.push("package.json → browserslist[]");
                }
            }
            else if (typeof browserslist === "object" && browserslist !== null) {
                // env-specific browserslist config
                for (const envKey of Object.keys(browserslist)) {
                    const envList = browserslist[envKey];
                    if (Array.isArray(envList)) {
                        const hasIE11 = envList.some((entry) => /ie\s*11/i.test(entry));
                        if (hasIE11) {
                            results.push(`package.json → browserslist.${envKey}[]`);
                        }
                    }
                }
            }
        }
        catch {
            // Ignore JSON parse errors
        }
    }
    return results;
}
/**
 * Detect tsconfig targets set to "es5".
 */
function detectEs5Target(projectRoot) {
    const matches = [];
    const possibleTsconfigs = [
        "tsconfig.json",
        "tsconfig.app.json",
        "tsconfig.browser.json"
    ];
    for (const file of possibleTsconfigs) {
        const fullPath = path.join(projectRoot, file);
        if (!fs.existsSync(fullPath))
            continue;
        try {
            const json = fs.readJSONSync(fullPath);
            if (json?.compilerOptions?.target === "es5") {
                matches.push(file);
            }
        }
        catch {
            // ignore
        }
    }
    return matches;
}
