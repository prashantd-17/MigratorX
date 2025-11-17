import fs from "fs-extra";
import path from "path";

export default {
  async runScanner() {
    const root = process.cwd();
    const deprecatedItems: string[] = [];
    const autoFixTargets: string[] = [];

    /**
     * 1) TypeScript version must be compatible with Angular 19
     *    (Angular 19 supports TS 5.6 and drops older TS like 5.4). :contentReference[oaicite:0]{index=0}
     */
    const tsVersionInfo = detectTypescriptVersion(root);
    if (tsVersionInfo && tsVersionInfo.requiresUpgrade) {
      deprecatedItems.push(
        `TypeScript version appears to be "${tsVersionInfo.raw}". Angular 19 expects TypeScript 5.6+.`
      );
      autoFixTargets.push("typescript56Upgrade");
    }

    /**
     * 2) Protractor builder was removed in Angular 19. :contentReference[oaicite:1]{index=1}
     *    If angular.json still references it, tests will break.
     */
    const angularJsonPath = path.join(root, "angular.json");
    if (fs.existsSync(angularJsonPath)) {
      const content = fs.readFileSync(angularJsonPath, "utf8");
      if (content.includes("@angular-devkit/build-angular:protractor")) {
        deprecatedItems.push(
          `Protractor builder detected in angular.json (removed in Angular 19). Migrate e2e tests to a supported runner.`
        );
        autoFixTargets.push("protractorBuilderReview"); // log-only autofix
      }
    }

    /**
     * 3) Extra safety: tsconfig target "es5" is definitely too old by now.
     *    Not strictly 19-only, but safe to modernize if still present.
     */
    const legacyTargets = detectLegacyTsTarget(root);
    if (legacyTargets.length) {
      deprecatedItems.push(
        ...legacyTargets.map(
          f => `tsconfig target "es5" detected → modernize recommended → ${f}`
        )
      );
      autoFixTargets.push("tsTargetModernize");
    }

    return { deprecatedItems, autoFixTargets };

    // ---------- helpers ----------

    function detectTypescriptVersion(projectRoot: string):
      | { raw: string; major: number; minor: number; patch: number; requiresUpgrade: boolean }
      | null {
      const pkgPath = path.join(projectRoot, "package.json");
      if (!fs.existsSync(pkgPath)) return null;

      try {
        const pkg = fs.readJSONSync(pkgPath);
        const raw =
          (pkg.devDependencies && pkg.devDependencies.typescript) ||
          (pkg.dependencies && pkg.dependencies.typescript);
        if (!raw || typeof raw !== "string") return null;

        const match = raw.match(/(\d+)\.(\d+)\.(\d+)/);
        if (!match) return { raw, major: 0, minor: 0, patch: 0, requiresUpgrade: true };

        const major = Number(match[1]);
        const minor = Number(match[2]);
        const patch = Number(match[3]);

        // Require >= 5.6.x
        const requiresUpgrade =
          major < 5 || (major === 5 && minor < 6);

        return { raw, major, minor, patch, requiresUpgrade };
      } catch {
        return null;
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
          // ignore
        }
      }

      return results;
    }
  }
};
