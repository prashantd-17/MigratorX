import fs from "fs-extra";
import path from "path";

export default {
  async runScanner() {
    const root = process.cwd();
    const deprecatedItems: string[] = [];
    const autoFixTargets: string[] = [];

    /**
     * 1) entryComponents — must not exist in Angular 18
     */
    const entryHits = find(/entryComponents\s*:/g);
    if (entryHits.length) {
      deprecatedItems.push(
        ...entryHits.map(f => `entryComponents still present → ${f}`)
      );
      autoFixTargets.push("entryComponentsFix");
    }

    /**
     * 2) HttpModule — still fatal in Angular 18
     */
    const httpHits = find(/HttpModule/g);
    if (httpHits.length) {
      deprecatedItems.push(
        ...httpHits.map(f => `HttpModule detected (must use HttpClientModule) → ${f}`)
      );
      autoFixTargets.push("httpModuleFix");
    }

    /**
     * 3) rxjs-compat — still used?
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
     * 5) AnimationModule.forRoot legacy
     */
    const animHits = find(/AnimationModule\.forRoot/g);
    if (animHits.length) {
      deprecatedItems.push(
        ...animHits.map(
          f =>
            `AnimationModule.forRoot detected → use provideAnimations() instead → ${f}`
        )
      );
      autoFixTargets.push("animationModuleFix");
    }

    /**
     * 6) tsconfig "es5" (too old for Angular 18)
     */
    const tsTargets = detectLegacyTsTarget(root);
    if (tsTargets.length) {
      deprecatedItems.push(
        ...tsTargets.map(
          f => `tsconfig target "es5" — update recommended → ${f}`
        )
      );
      autoFixTargets.push("tsTargetModernize");
    }

    /**
     * 7) Suggest standalone + provideHttpClient (optional)
     */
    const hasAppModule = fs.existsSync(path.join(root, "src/app/app.module.ts"));
    if (hasAppModule) {
      deprecatedItems.push(
        "ℹ Angular 18 recommends standalone bootstrap (NgModule bootstrap is still supported but discouraged)."
      );
    }

    const httpClientProvideHits = find(/provideHttpClient/g);
    if (!httpClientProvideHits.length) {
      deprecatedItems.push(
        "ℹ Angular 18 recommends provideHttpClient() for bootstrap (optional)."
      );
    }

    /**
     * 8) zone.js (optional zoneless migration)
     */
    const zoneHits = find(/zone\.js/g);
    if (zoneHits.length) {
      deprecatedItems.push(
        ...zoneHits.map(
          f => `zone.js detected → Angular supports zoneless mode (optional) → ${f}`
        )
      );
    }

    return { deprecatedItems, autoFixTargets };

    // ----- helpers -----
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
            ) {
              continue;
            }
            walk(full);
          } else if (
            entry.endsWith(".ts") ||
            entry.endsWith(".html") ||
            entry.endsWith(".json")
          ) {
            const content = fs.readFileSync(full, "utf8");
            if (pattern.test(content)) results.push(full);
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
        } catch {}
      }
      return results;
    }
  }
};
