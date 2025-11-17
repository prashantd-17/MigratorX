import fs from "fs-extra";
import path from "path";

export default {
  /**
   * Angular 16 → 17 migration scan
   */
  async runScanner() {
    const root = process.cwd();
    const deprecatedItems: string[] = [];
    const autoFixTargets: string[] = [];

    /**
     * 1) Still using entryComponents (leftover from old migrations)
     */
    const entryHits = find(/entryComponents\s*:/g);
    if (entryHits.length) {
      deprecatedItems.push(
        ...entryHits.map(f => `entryComponents still present → ${f}`)
      );
      autoFixTargets.push("entryComponentsFix");
    }

    /**
     * 2) HttpModule — should be gone for sure in Angular 17
     */
    const httpHits = find(/HttpModule/g);
    if (httpHits.length) {
      deprecatedItems.push(
        ...httpHits.map(f => `HttpModule still used (blocking future upgrades) → ${f}`)
      );
      autoFixTargets.push("httpModuleFix");
    }

    /**
     * 3) rxjs-compat — still present?
     */
    const compatHits = find(/rxjs-compat/g);
    if (compatHits.length) {
      deprecatedItems.push(
        ...compatHits.map(f => `rxjs-compat still used → ${f}`)
      );
      autoFixTargets.push("rxjsCompatRemovalFix");
    }

    /**
     * 4) ModuleWithProviders without generic type
     */
    const mwpHits = find(/ModuleWithProviders\s*(?!<)/g);
    if (mwpHits.length) {
      deprecatedItems.push(
        ...mwpHits.map(
          f => `ModuleWithProviders without generic type → ${f}`
        )
      );
      autoFixTargets.push("moduleWithProvidersGenericFix");
    }

    /**
     * 5) Use of BrowserAnimationsModule instead of provideAnimations() (optional)
     */
    const bamHits = find(/BrowserAnimationsModule/g);
    if (bamHits.length) {
      deprecatedItems.push(
        ...bamHits.map(
          f => `BrowserAnimationsModule detected — consider provideAnimations() → ${f}`
        )
      );
      // autoFix optional; user has the choice
    }

    /**
     * 6) Still using AppModule bootstrap instead of standalone
     */
    const hasAppModule = fs.existsSync(path.join(root, "src/app/app.module.ts"));
    const hasMain = fs.existsSync(path.join(root, "src/main.ts"));
    if (hasAppModule && hasMain) {
      deprecatedItems.push(
        "ℹ Angular 17: standalone bootstrap (no NgModule) is recommended — optional migration."
      );
    }

    /**
     * 7) Zone.js usage still detected (optional upgrade)
     */
    const zoneHits = find(/zone\.js/g);
    if (zoneHits.length) {
      deprecatedItems.push(
        ...zoneHits.map(
          f => `zone.js detected — Angular 17 supports "zoneless" mode. Optional migration → ${f}`
        )
      );
    }

    return { deprecatedItems, autoFixTargets };

    // ------ helpers ------
    function find(pattern: RegExp): string[] {
      const results: string[] = [];
      walk(root);
      return results;
      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir)) {
          const full = path.join(dir, entry);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            if (
              full.includes("node_modules") ||
              full.includes("dist") ||
              full.includes("build") ||
              full.includes("out-tsc")
            )
              continue;
            walk(full);
          } else if (
            entry.endsWith(".ts") ||
            entry.endsWith(".json") ||
            entry.endsWith(".html")
          ) {
            const content = fs.readFileSync(full, "utf8");
            if (pattern.test(content)) results.push(full);
          }
        }
      }
    }
  }
};
