import fs from "fs-extra";
import path from "path";

export default {
  /**
   * Scan for Angular 15 → 16 breaking/risky changes (balanced).
   * Uses existing autofix targets where safe; the rest are review-only.
   */
  async runScanner() {
    const root = process.cwd();
    const deprecatedItems: string[] = [];
    const autoFixTargets: string[] = [];

    /**
     * 1) entryComponents — should be gone by now, but still worth checking.
     */
    const entryCompHits = scanAll(/entryComponents\s*:/g);
    if (entryCompHits.length) {
      deprecatedItems.push(
        ...entryCompHits.map(f => `entryComponents still used → ${f}`)
      );
      autoFixTargets.push("entryComponentsFix");
    }

    /**
     * 2) HttpModule — still a red flag in any modern Angular version.
     */
    const httpHits = scanAll(/HttpModule/g);
    if (httpHits.length) {
      deprecatedItems.push(
        ...httpHits.map(
          f => `HttpModule detected (use HttpClientModule) → ${f}`
        )
      );
      autoFixTargets.push("httpModuleFix");
    }

    /**
     * 3) tsconfig target "es5" — too old for v16.
     */
    const tsTargets = detectLegacyTsTarget(root);
    if (tsTargets.length) {
      deprecatedItems.push(
        ...tsTargets.map(
          f =>
            `tsconfig target "es5" — prefer "es2015" or later for Angular 16 → ${f}`
        )
      );
      autoFixTargets.push("tsTargetModernize");
    }

    /**
     * 4) rxjs-compat — if still present, strongly recommended to remove.
     */
    const rxjsCompatHits = scanAll(/rxjs-compat/g);
    if (rxjsCompatHits.length) {
      deprecatedItems.push(
        ...rxjsCompatHits.map(
          f => `rxjs-compat usage detected (RxJS 7+ recommended) → ${f}`
        )
      );
      autoFixTargets.push("rxjsCompatRemovalFix");
    }

    /**
     * 5) ModuleWithProviders without generic type still hanging around.
     */
    const moduleWithProvidersHits = scanAll(/ModuleWithProviders\s*(?!<)/g);
    if (moduleWithProvidersHits.length) {
      deprecatedItems.push(
        ...moduleWithProvidersHits.map(
          f =>
            `ModuleWithProviders without generic type detected → ${f}`
        )
      );
      autoFixTargets.push("moduleWithProvidersGenericFix");
    }

    /**
     * 6) Optional info: project not yet standalone-first.
     *    (No autofix yet — just information.)
     */
    const hasAppModule = fs.existsSync(path.join(root, "src/app/app.module.ts"));
    const hasMainTs = fs.existsSync(path.join(root, "src/main.ts"));
    if (hasAppModule && hasMainTs) {
      deprecatedItems.push(
        "ℹ Angular 16: Standalone bootstrap is recommended but optional. Consider migrating from NgModule-based bootstrap to standalone."
      );
    }

    /**
     * 7) Optional info: zone.js still used.
     *    Zoneless support is optional; do not auto-remove.
     */
    const zoneJsHits = scanAll(/zone\.js/g);
    if (zoneJsHits.length) {
      deprecatedItems.push(
        ...zoneJsHits.map(
          f =>
            `zone.js detected → Angular 16 supports zoneless apps (optional). Review if you want to migrate → ${f}`
        )
      );
      // no autofix, purely informational
    }

    return { deprecatedItems, autoFixTargets };

    // ------------- helpers -------------

    function scanAll(pattern: RegExp): string[] {
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
            ) {
              continue;
            }
            walk(full);
          } else if (
            entry.endsWith(".ts") ||
            entry.endsWith(".json") ||
            entry.endsWith(".html")
          ) {
            const content = fs.readFileSync(full, "utf8");
            if (pattern.test(content)) {
              results.push(full);
            }
          }
        }
      }
    }

    function detectLegacyTsTarget(projectRoot: string): string[] {
      const results: string[] = [];
      const files = ["tsconfig.json", "tsconfig.app.json", "tsconfig.browser.json"];

      for (const file of files) {
        const full = path.join(projectRoot, file);
        if (!fs.existsSync(full)) continue;

        try {
          const json = fs.readJSONSync(full);
          if (json?.compilerOptions?.target === "es5") {
            results.push(full);
          }
        } catch {
          // ignore parse errors
        }
      }

      return results;
    }
  }
};
