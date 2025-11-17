import fs from "fs-extra";
import path from "path";

export default {
  /**
   * Detect deprecated APIs & identify possible autofix targets
   */
  async runScanner() {
    const projectRoot = process.cwd();
    const deprecatedItems: string[] = [];
    const autoFixTargets: string[] = [];

    /** 1. Scan TypeScript files for deprecated Renderer */
    const rendererHits = scanAllFiles(/Renderer\s*:/g);
    if (rendererHits.length) {
      deprecatedItems.push(...rendererHits.map(f => `Renderer deprecated → ${f}`));
      autoFixTargets.push("rendererFix");
    }

    /** 2. Detect HttpModule */
    const httpHits = scanAllFiles(/HttpModule/g);
    if (httpHits.length) {
      deprecatedItems.push(...httpHits.map(f => `HttpModule removed → ${f}`));
      autoFixTargets.push("httpModuleFix");
    }

    /** 3. Detect entryComponents (should be removed) */
    const entryCompHits = scanAllFiles(/entryComponents\s*:/g);
    if (entryCompHits.length) {
      deprecatedItems.push(...entryCompHits.map(f => `entryComponents deprecated → ${f}`));
      autoFixTargets.push("entryComponentsFix");
    }

    /** 4. Detect enableIvy:false (ViewEngine) */
    const ivyHits = scanAllFiles(/enableIvy\s*:\s*false/g);
    if (ivyHits.length) {
      deprecatedItems.push(...ivyHits.map(f => `ViewEngine removed → ${f}`));
      autoFixTargets.push("forceIvyFix");
    }

    return { deprecatedItems, autoFixTargets };

    /** Helper function (local to this rule) */
    function scanAllFiles(pattern: RegExp): string[] {
      const files: string[] = [];
      traverse(projectRoot);
      return files;

      function traverse(dir: string) {
        const entries = fs.readdirSync(dir);
        for (const file of entries) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !fullPath.includes("node_modules")) {
            traverse(fullPath);
          } else if (file.endsWith(".ts") || file.endsWith(".json")) {
            const content = fs.readFileSync(fullPath, "utf8");
            if (pattern.test(content)) {
              files.push(`${fullPath}`);
            }
          }
        }
      }
    }
  }
};
