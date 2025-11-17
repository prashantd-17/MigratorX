// src/engine/autofixes/angular.ts
import fs from "fs-extra";
import path from "path";
import { Project, SyntaxKind } from "ts-morph";
import chalk from "chalk";
/**
 * Pick a tsconfig file for ts-morph project initialization.
 */
function getTsConfigPath(rootDir: string): string | undefined {
  const candidates = ["tsconfig.app.json", "tsconfig.json"];
  for (const name of candidates) {
    const full = path.join(rootDir, name);
    if (fs.existsSync(full)) return full;
  }
  return undefined;
}

/**
 * 1) enableIvy:false → remove it (ViewEngine is gone)
 */
export async function applyEnableIvyFix(rootDir: string): Promise<number> {
  const candidates = [
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.browser.json",
    "angular.json",
  ];

  let changedFiles = 0;

  for (const file of candidates) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const content = fs.readFileSync(fullPath, "utf8");
      if (!/enableIvy\s*:\s*false/.test(content)) continue;

      const updated = content.replace(/enableIvy\s*:\s*false\s*,?/g, "");
      if (updated !== content) {
        fs.writeFileSync(fullPath, updated, "utf8");
        console.log(
          chalk.yellow(`🔧 Auto-fix: removed 'enableIvy: false' in ${file}`)
        );
        changedFiles++;
      }
    } catch (err) {
      console.error(chalk.red(`❌ Failed to apply enableIvy fix in ${file}`));
    }
  }

  return changedFiles;
}

/**
 * 2) HttpModule → HttpClientModule in NgModules
 */
export async function applyHttpModuleFix(rootDir: string): Promise<number> {
  const tsconfigPath = getTsConfigPath(rootDir);
  if (!tsconfigPath) {
    console.log(chalk.gray("⚠ No tsconfig found for HttpModule fix."));
    return 0;
  }

  const project = new Project({ tsConfigFilePath: tsconfigPath });
  const sourceFiles = project.getSourceFiles("**/*.module.ts");

  let changedFiles = 0;

  for (const sf of sourceFiles) {
    let changed = false;

    // 2.1 Remove HttpModule import from '@angular/http'
    const imports = sf.getImportDeclarations();
    for (const imp of imports) {
      const spec = imp.getModuleSpecifierValue();
      if (spec === "@angular/http") {
        const named = imp.getNamedImports();
        const httpImport = named.find((n) => n.getName() === "HttpModule");
        if (httpImport) {
          httpImport.remove();
          if (imp.getNamedImports().length === 0) {
            imp.remove();
          }
          changed = true;
        }
      }
    }

    // 2.2 Ensure HttpClientModule is imported from '@angular/common/http'
    let httpClientImport = imports.find(
      (imp) => imp.getModuleSpecifierValue() === "@angular/common/http"
    );
    if (!httpClientImport) {
      sf.addImportDeclaration({
        moduleSpecifier: "@angular/common/http",
        namedImports: ["HttpClientModule"],
      });
      changed = true;
    } else {
      const hasClient = httpClientImport
        .getNamedImports()
        .some((n) => n.getName() === "HttpClientModule");
      if (!hasClient) {
        httpClientImport.addNamedImport("HttpClientModule");
        changed = true;
      }
    }

    // 2.3 Add HttpClientModule to @NgModule imports[]
    const decorators = sf.getDescendantsOfKind(SyntaxKind.Decorator);
    for (const dec of decorators) {
      const callExpr = dec.getExpression().asKind(SyntaxKind.CallExpression);
      if (!callExpr) continue;

      const expr = callExpr.getExpression();
      if (expr.getText() !== "NgModule") continue;

      const arg = callExpr.getArguments()[0];
      if (!arg || !arg.asKind) continue;

      const obj = arg.asKind(SyntaxKind.ObjectLiteralExpression);
      if (!obj) continue;

      const importsProp = obj
        .getProperties()
        .find(
          (p) =>
            p.getKind() === SyntaxKind.PropertyAssignment &&
            (p as any).getName &&
            (p as any).getName() === "imports"
        ) as any;

      if (!importsProp) continue;

      const initializer = importsProp
        .getInitializer()
        ?.asKind(SyntaxKind.ArrayLiteralExpression);
      if (!initializer) continue;

      const hasHttpClient = initializer
        .getElements()
        .some((e) => e.getText() === "HttpClientModule");

      if (!hasHttpClient) {
        initializer.addElement("HttpClientModule");
        changed = true;
      }
    }

    if (changed) {
      changedFiles++;
    }
  }

  if (changedFiles > 0) {
    await project.save();
    console.log(
      chalk.yellow(
        `🔧 Auto-fix: HttpModule → HttpClientModule in ${changedFiles} module file(s).`
      )
    );
  }

  return changedFiles;
}

/**
 * 3) Remove entryComponents from NgModule metadata
 */
export async function applyEntryComponentsFix(
  rootDir: string
): Promise<number> {
  const tsconfigPath = getTsConfigPath(rootDir);
  if (!tsconfigPath) {
    console.log(chalk.gray("⚠ No tsconfig found for entryComponents fix."));
    return 0;
  }

  const project = new Project({ tsConfigFilePath: tsconfigPath });
  const sourceFiles = project.getSourceFiles("**/*.module.ts");

  let changedFiles = 0;

  for (const sf of sourceFiles) {
    let changed = false;

    const decorators = sf.getDescendantsOfKind(SyntaxKind.Decorator);
    for (const dec of decorators) {
      const callExpr = dec.getExpression().asKind(SyntaxKind.CallExpression);
      if (!callExpr) continue;
      const expr = callExpr.getExpression();
      if (expr.getText() !== "NgModule") continue;

      const arg = callExpr.getArguments()[0];
      const obj = arg?.asKind(SyntaxKind.ObjectLiteralExpression);
      if (!obj) continue;

      const props = obj.getProperties();
      for (const prop of props) {
        if (
          prop.getKind() === SyntaxKind.PropertyAssignment &&
          (prop as any).getName &&
          (prop as any).getName() === "entryComponents"
        ) {
          prop.remove();
          changed = true;
        }
      }
    }

    if (changed) {
      changedFiles++;
    }
  }

  if (changedFiles > 0) {
    await project.save();
    console.log(
      chalk.yellow(
        `🔧 Auto-fix: removed entryComponents in ${changedFiles} module file(s).`
      )
    );
  }

  return changedFiles;
}

/**
 * 4) Remove IE11 from browserslist configs
 */
export async function applyBrowserslistIEFix(rootDir: string): Promise<number> {
  let changedFiles = 0;

  // .browserslistrc
  const browserslistRc = path.join(rootDir, ".browserslistrc");
  if (fs.existsSync(browserslistRc)) {
    const content = fs.readFileSync(browserslistRc, "utf8");
    const lines = content.split(/\r?\n/);
    const filtered = lines.filter(
      (line) => !/ie\s*11/i.test(line.trim())
    );
    if (filtered.join("\n") !== content) {
      fs.writeFileSync(browserslistRc, filtered.join("\n"), "utf8");
      console.log(
        chalk.yellow("🔧 Auto-fix: removed IE11 from .browserslistrc")
      );
      changedFiles++;
    }
  }

  // browserslist file
  const browserslistFile = path.join(rootDir, "browserslist");
  if (fs.existsSync(browserslistFile)) {
    const content = fs.readFileSync(browserslistFile, "utf8");
    const lines = content.split(/\r?\n/);
    const filtered = lines.filter(
      (line) => !/ie\s*11/i.test(line.trim())
    );
    if (filtered.join("\n") !== content) {
      fs.writeFileSync(browserslistFile, filtered.join("\n"), "utf8");
      console.log(
        chalk.yellow("🔧 Auto-fix: removed IE11 from browserslist file")
      );
      changedFiles++;
    }
  }

  // package.json → browserslist config
  const packageJsonPath = path.join(rootDir, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = fs.readJSONSync(packageJsonPath);
      let modified = false;

      const processList = (list: string[]): string[] => {
        const before = list.length;
        const afterList = list.filter((item) => !/ie\s*11/i.test(item));
        if (afterList.length !== before) modified = true;
        return afterList;
      };

      if (Array.isArray(pkg.browserslist)) {
        pkg.browserslist = processList(pkg.browserslist);
      } else if (typeof pkg.browserslist === "object" && pkg.browserslist) {
        for (const envKey of Object.keys(pkg.browserslist)) {
          const value = pkg.browserslist[envKey];
          if (Array.isArray(value)) {
            pkg.browserslist[envKey] = processList(value);
          }
        }
      }

      if (modified) {
        fs.writeJSONSync(packageJsonPath, pkg, { spaces: 2 });
        console.log(
          chalk.yellow("🔧 Auto-fix: removed IE11 from package.json browserslist")
        );
        changedFiles++;
      }
    } catch {
      // ignore
    }
  }

  return changedFiles;
}

/**
 * 5) tsconfig target "es5" → "es2015"
 */
export async function applyTsTargetModernize(
  rootDir: string
): Promise<number> {
  const candidates = ["tsconfig.json", "tsconfig.app.json", "tsconfig.browser.json"];
  let changedFiles = 0;

  for (const file of candidates) {
    const full = path.join(rootDir, file);
    if (!fs.existsSync(full)) continue;

    try {
      const json = fs.readJSONSync(full);
      if (json?.compilerOptions?.target === "es5") {
        json.compilerOptions.target = "es2015";
        fs.writeJSONSync(full, json, { spaces: 2 });
        console.log(
          chalk.yellow(`🔧 Auto-fix: tsconfig target es5 → es2015 in ${file}`)
        );
        changedFiles++;
      }
    } catch {
      // ignore parse/write errors
    }
  }

  return changedFiles;
}

/**
 * 6) CommonJS require() usage — for now, just log.
 * Real auto-fix is complex (convert require → import).
 */
export async function applyCommonJsReviewNote(_rootDir: string): Promise<void> {
  console.log(
    chalk.yellow(
      "ℹ commonJsUsageReview: Detected require() usage. Manual review is recommended; automatic conversion is not implemented yet."
    )
  );
}

/**
 * 7) AnimationModule.forRoot → provideAnimations()
 */
export async function applyAnimationModuleFix(rootDir: string): Promise<number> {
  const tsconfigPath = getTsConfigPath(rootDir);
  if (!tsconfigPath) return 0;

  const project = new Project({ tsConfigFilePath: tsconfigPath });
  const moduleFiles = project.getSourceFiles("**/*.module.ts");

  let changedFiles = 0;
  for (const sf of moduleFiles) {
    let changed = false;

    // remove AnimationModule.forRoot(...)
    sf.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(c => c.getExpression().getText() === "AnimationModule.forRoot")
      .forEach(call => {
        call.replaceWithText("provideAnimations()");
        changed = true;
      });

    // ensure import provideAnimations
    if (changed) {
      const imp = sf.getImportDeclaration(
        i => i.getModuleSpecifierValue() === "@angular/platform-browser/animations"
      );
      if (!imp) {
        sf.addImportDeclaration({
          moduleSpecifier: "@angular/platform-browser/animations",
          namedImports: ["provideAnimations"]
        });
      } else {
        if (!imp.getNamedImports().some(n => n.getName() === "provideAnimations")) {
          imp.addNamedImport("provideAnimations");
        }
      }
    }

    if (changed) changedFiles++;
  }

  if (changedFiles > 0) {
    await project.save();
    console.log(chalk.yellow(`🔧 Auto-fix: AnimationModule.forRoot → provideAnimations() in ${changedFiles} file(s)`));
  }
  return changedFiles;
}

/**
 * 8) Remove rxjs-compat
 */
export async function applyRxjsCompatRemovalFix(rootDir: string): Promise<number> {
  let changed = false;

  // package.json removal
  const pkgPath = path.join(rootDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = fs.readJSONSync(pkgPath);
    if (pkg.dependencies?.["rxjs-compat"]) {
      delete pkg.dependencies["rxjs-compat"];
      fs.writeJSONSync(pkgPath, pkg, { spaces: 2 });
      changed = true;
      console.log(chalk.yellow("🔧 Auto-fix: removed rxjs-compat from package.json"));
    }
  }

  // remove import 'rxjs-compat';
  const tsconfigPath = getTsConfigPath(rootDir);
  if (tsconfigPath) {
    const project = new Project({ tsConfigFilePath: tsconfigPath });
    project.getSourceFiles("**/*.ts")
      .forEach(sf => {
        const before = sf.getText();
        sf.getImportDeclarations()
          .filter(i => i.getModuleSpecifierValue() === "rxjs-compat")
          .forEach(i => i.remove());
        if (sf.getText() !== before) changed = true;
      });
    if (changed) await project.save();
  }

  return changed ? 1 : 0;
}

/**
 * 9) ModuleWithProviders → ModuleWithProviders<ModuleName>
 */
export async function applyModuleWithProvidersGenericFix(rootDir: string): Promise<number> {
  const tsconfigPath = getTsConfigPath(rootDir);
  if (!tsconfigPath) return 0;

  const project = new Project({ tsConfigFilePath: tsconfigPath });
  const files = project.getSourceFiles("**/*.ts");
  let changedCount = 0;

  for (const sf of files) {
    let changed = false;

    sf.getDescendantsOfKind(SyntaxKind.TypeReference)
      .filter(t => t.getText() === "ModuleWithProviders")
      .forEach(t => {
        const moduleName = inferModuleName(sf);
        t.replaceWithText(`ModuleWithProviders<${moduleName}>`);
        changed = true;
      });

    if (changed) changedCount++;
  }

  if (changedCount > 0) {
    await project.save();
    console.log(chalk.yellow(`🔧 Auto-fix: added ModuleWithProviders<T> generics in ${changedCount} file(s)`));
  }

  return changedCount;

  function inferModuleName(sf: any): string {
    const cls = sf.getClasses()[0];
    return cls ? cls.getName() + "" : "unknown";
  }
}

export async function applyTypescript56Upgrade(rootDir: string): Promise<number> {
  const packageJsonPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return 0;
  }

  let changed = false;
  const pkg = fs.readJSONSync(packageJsonPath);

  function maybeBump(container: any) {
    if (!container || typeof container.typescript !== "string") return;

    const raw = container.typescript;
    const match = raw.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      // unknown range like "^5" → be conservative and leave it
      return;
    }

    const major = Number(match[1]);
    const minor = Number(match[2]);

    // If < 5.6, bump to ^5.6.0
    if (major < 5 || (major === 5 && minor < 6)) {
      container.typescript = "^5.6.0";
      changed = true;
    }
  }

  maybeBump(pkg.dependencies);
  maybeBump(pkg.devDependencies);

  if (changed) {
    fs.writeJSONSync(packageJsonPath, pkg, { spaces: 2 });
    console.log(
      chalk.yellow("🔧 Auto-fix: updated TypeScript version in package.json to ^5.6.0 for Angular 19 compatibility.")
    );
    return 1;
  }

  return 0;
}

export async function applyProtractorBuilderReview(rootDir: string): Promise<void> {
  const angularJsonPath = path.join(rootDir, "angular.json");
  if (!fs.existsSync(angularJsonPath)) return;

  console.log(
    chalk.yellow(
      "ℹ protractorBuilderReview: Angular 19 removed the Protractor builder. " +
        "Migrate your e2e tests to a supported runner (e.g. Cypress, Playwright, Web Test Runner) " +
        "and remove the Protractor configuration from angular.json."
    )
  );
}
