import fs from "fs-extra";
import path from "path";

export default {
  /**
   * Scan for Angular 14 → 15 breaking/risky changes
   */
  async runScanner() {
    const root = process.cwd();
    const deprecatedItems: string[] = [];
    const autoFixTargets: string[] = [];

    /**
     * 1) entryComponents — must not exist in 15+
     */
    const entryCompHits = scanAll(/entryComponents\s*:/g);
    if (entryCompHits.length) {
      deprecatedItems.push(
        ...entryCompHits.map(f => `entryComponents still used → ${f}`)
      );
      autoFixTargets.push("entryComponentsFix");
    }

    /**
     * 2) HttpModule legacy
     */
    const httpHits = scanAll(/HttpModule/g);
    if (httpHits.length) {
      deprecatedItems.push(
        ...httpHits.map(f => `HttpModule detected (use HttpClientModule) → ${f}`)
      );
      autoFixTargets.push("httpModuleFix");
    }

    /**
     * 3) tsconfig "target": "es5" (not ideal for Angular 15)
     */
    const tsTargets = detectLegacyTsTarget();
    if (tsTargets.length) {
      deprecatedItems.push(
        ...tsTargets.map(
          f => `tsconfig target "es5" — prefer "es2015" or later → ${f}`
        )
      );
      autoFixTargets.push("tsTargetModernize");
    }

    /**
     * 4) AnimationModule.forRoot removed
     */
    const animHits = scanAll(/AnimationModule\.forRoot/g);
    if (animHits.length) {
      deprecatedItems.push(
        ...animHits.map(
          f =>
            `AnimationModule.forRoot is not supported → use provideAnimations() instead → ${f}`
        )
      );
      autoFixTargets.push("animationModuleReview");
    }

    /**
     * 5) BrowserAnimationsModule optional migration
     */
    const bamHits = scanAll(/BrowserAnimationsModule/g);
    if (bamHits.length) {
      deprecatedItems.push(
        ...bamHits.map(
          f =>
            `BrowserAnimationsModule detected — consider \`provideAnimations()\` (optional) → ${f}`
        )
      );
      // No auto replace — too risky
    }

    /**
     * 6) RouterModule.forRoot strict options warnings
     */
    const routerHits = scanAll(/RouterModule\.forRoot/g);
    if (routerHits.length) {
      deprecatedItems.push(
        ...routerHits.map(
          f =>
            `RouterModule.forRoot: review strict options for Angular 15 (optional) → ${f}`
        )
      );
      autoFixTargets.push("routerStrictOptionsReview");
    }

    /**
     * 7) Optional: upgrade to standalone bootstrap (manual guidance only)
     */
    deprecatedItems.push(
      `ℹ Angular 15 supports standalone apps — conversion is optional (no breaking change).`
    );

    return { deprecatedItems, autoFixTargets };

    // ----------- helpers ------------

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

    function detectLegacyTsTarget(): string[] {
      const results: string[] = [];
      const files = ["tsconfig.json", "tsconfig.app.json", "tsconfig.browser.json"];

      for (const file of files) {
        const full = path.join(root, file);
        if (!fs.existsSync(full)) continue;
        try {
          const json = fs.readJSONSync(full);
          if (json?.compilerOptions?.target === "es5") {
            results.push(full);
          }
        } catch {
          // ignore
        }
      }

      return results;
    }
  }
};
