// src/engine/auto-fixer.ts
import chalk from "chalk";
import {
  applyEnableIvyFix,
  applyHttpModuleFix,
  applyEntryComponentsFix,
  applyBrowserslistIEFix,
  applyTsTargetModernize,
  applyCommonJsReviewNote,
  applyAnimationModuleFix,
  applyRxjsCompatRemovalFix,
  applyModuleWithProvidersGenericFix,
  applyProtractorBuilderReview,
  applyTypescript56Upgrade,
} from "./autofixes/angular.js";

/**
 * Apply real autofix actions for a set of symbolic fix names.
 * Each fix name comes from the rule files (10-to-11, 11-to-12, etc).
 */
export async function applyAutoFixes(autoFixTargets: string[]): Promise<number> {
  if (!autoFixTargets.length) {
    return 0;
  }

  console.log(chalk.yellow(`\n🛠 Autofixer requested for: ${autoFixTargets.join(", ")}`));

  let appliedCount = 0;
  const rootDir = process.cwd();

  for (const fix of autoFixTargets) {
    switch (fix) {
      case "forceIvyFix": {
        const changed = await applyEnableIvyFix(rootDir);
        appliedCount += changed;
        break;
      }
      case "httpModuleFix": {
        const changed = await applyHttpModuleFix(rootDir);
        appliedCount += changed;
        break;
      }
      case "entryComponentsFix": {
        const changed = await applyEntryComponentsFix(rootDir);
        appliedCount += changed;
        break;
      }
      case "ie11BrowserslistCleanup": {
        const changed = await applyBrowserslistIEFix(rootDir);
        appliedCount += changed;
        break;
      }
      case "tsTargetModernize": {
        const changed = await applyTsTargetModernize(rootDir);
        appliedCount += changed;
        break;
      }
      case "commonJsUsageReview": {
        // This one is a “log-only” helper – no automatic code edit yet
        await applyCommonJsReviewNote(rootDir);
        break;
      }

    case "animationModuleFix": {
      const changed = await applyAnimationModuleFix(rootDir);
      appliedCount += changed;
      break;
    }

    case "rxjsCompatRemovalFix": {
      const changed = await applyRxjsCompatRemovalFix(rootDir);
      appliedCount += changed;
      break;
    }

    case "moduleWithProvidersGenericFix": {
      const changed = await applyModuleWithProvidersGenericFix(rootDir);
      appliedCount += changed;
      break;
    }

     case "typescript56Upgrade": {
      const changed = await applyTypescript56Upgrade(rootDir);
      appliedCount += changed;
      break;
    }

    case "protractorBuilderReview": {
      await applyProtractorBuilderReview(rootDir);
      break;
    }
      
      // Add future fixes here:
      // case "rendererFix": ...
      // case "rxjsOperatorFix": ...
      default:
        console.log(chalk.gray(`⚠ No autofix handler implemented yet for "${fix}".`));
    }
  }

  if (appliedCount > 0) {
    console.log(chalk.green(`\n✨ Total real changes applied: ${appliedCount}`));
  } else {
    console.log(chalk.yellow(`\nℹ Autofixer executed, but no file changes were required.`));
  }

  return appliedCount;
}
