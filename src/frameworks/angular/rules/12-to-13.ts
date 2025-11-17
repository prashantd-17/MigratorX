import fs from "fs-extra";
import path from "path";

export default {
  /**
   * Run scanning for Angular 12 → 13 breaking changes (balanced mode)
   */
  async runScanner() {
    const root = process.cwd();
    const deprecatedItems: string[] = [];
    const autoFixTargets: string[] = [];

    /** 1. ViewEngine (enableIvy:false) — MUST be removed */
    const ivyHits = scanAllFiles(/enableIvy\s*:\s*false/g);
    if (ivyHits.length) {
      deprecatedItems.push(
        ...ivyHits.map(f => `ViewEngine / enableIvy:false still present → ${f}`)
      );
      autoFixTargets.push("forceIvyFix");
    }

    /** 2. entryComponents — removed in Ivy compiler */
    const entryCompHits = scanAllFiles(/entryComponents\s*:/g);
    if (entryCompHits.length) {
      deprecatedItems.push(
        ...entryCompHits.map(f => `entryComponents still used → ${f}`)
      );
      autoFixTargets.push("entryComponentsFix");
    }

    /** 3. Custom Webpack config (Angular CLI 13 requires Webpack 5) */
    const webpackConfig = path.join(root, "webpack.config.js");
    const extraWebpack = path.join(root, "extra-webpack.config.js");
    if (fs.existsSync(webpackConfig) || fs.existsSync(extraWebpack)) {
      deprecatedItems.push(
        `⚠ Custom Webpack config detected — verify Webpack 5 compatibility manually`
      );
      autoFixTargets.push("webpackConfigReview");
    }

    /** 4. ControlValueAccessor legacy signature */
    const cvaHits = scanAllFiles(/writeValue\s*\(\s*value\?\s*:\s*any/g);
    if (cvaHits.length) {
      deprecatedItems.push(
        ...cvaHits.map(
          f => `ControlValueAccessor "writeValue?" signature deprecated → ${f}`
        )
      );
      autoFixTargets.push("cvaSignatureReview");
    }

    /** 5. i18n legacy message ID format (long IDs removed in v13) */
    const i18nHits = scanAllFiles(/<ph\s+name=/g);
    if (i18nHits.length) {
      deprecatedItems.push(
        ...i18nHits.map(
          f => `Legacy i18n message identifier format detected → ${f}`
        )
      );
      autoFixTargets.push("i18nIdReview");
    }

    /** 6. tsconfig targeting ES5 (not recommended for Angular 13) */
    const tsConfigHits = detectLegacyTsTarget();
    if (tsConfigHits.length) {
      deprecatedItems.push(
        ...tsConfigHits.map(f => `tsconfig target "es5" → modernize recommended → ${f}`)
      );
      autoFixTargets.push("tsTargetModernize");
    }

    return { deprecatedItems, autoFixTargets };

    /** Helpers */

    function scanAllFiles(pattern: RegExp): string[] {
      const results: string[] = [];
      traverse(root);
      return results;

      function traverse(dir: string) {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
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
            traverse(full);
          } else if (
            entry.endsWith(".ts") ||
            entry.endsWith(".html") ||
            entry.endsWith(".json")
          ) {
            const content = fs.readFileSync(full, "utf8");
            if (pattern.test(content)) {
              results.push(full);
            }
          }
        }
      }
    }

    function detectLegacyTsTarget(): string[] {
      const results: string[] = [];
      const files = ["tsconfig.json", "tsconfig.app.json", "tsconfig.browser.json"];

      for (const f of files) {
        const full = path.join(root, f);
        if (!fs.existsSync(full)) continue;

        try {
          const json = fs.readJSONSync(full);
          if (json?.compilerOptions?.target === "es5") {
            results.push(full);
          }
        } catch {
          // ignore parsing error
        }
      }
      return results;
    }
  }
};
