import path from "path";
import fs from "fs-extra";
function getFallbackRule(fromVersion, toVersion) {
    return {
        async runScanner() {
            return {
                deprecatedItems: [
                    `⚠ No rule defined for migration ${fromVersion} → ${toVersion}.`,
                    `⚠ No scanning performed.`
                ],
                autoFixTargets: []
            };
        }
    };
}
export async function getRulesForVersion(fromVersion, toVersion) {
    const rulesDir = path.join(process.cwd(), "src", "frameworks", "angular", "rules");
    const ruleFileName = `${fromVersion}-to-${toVersion}.js`; // When compiled to dist
    const ruleFileTs = `${fromVersion}-to-${toVersion}.ts`; // Dev mode fallback
    const ruleJsPath = path.join(rulesDir, ruleFileName);
    const ruleTsPath = path.join(rulesDir, ruleFileTs);
    // JS build file takes priority (dist)
    if (fs.existsSync(ruleJsPath)) {
        const mod = await import(ruleJsPath);
        return mod.default;
    }
    // TS file fallback for dev mode
    if (fs.existsSync(ruleTsPath)) {
        const mod = await import(ruleTsPath);
        return mod.default;
    }
    // Fallback if no rule exists
    return getFallbackRule(fromVersion, toVersion);
}
