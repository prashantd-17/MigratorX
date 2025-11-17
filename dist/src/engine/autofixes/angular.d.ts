/**
 * 1) enableIvy:false → remove it (ViewEngine is gone)
 */
export declare function applyEnableIvyFix(rootDir: string): Promise<number>;
/**
 * 2) HttpModule → HttpClientModule in NgModules
 */
export declare function applyHttpModuleFix(rootDir: string): Promise<number>;
/**
 * 3) Remove entryComponents from NgModule metadata
 */
export declare function applyEntryComponentsFix(rootDir: string): Promise<number>;
/**
 * 4) Remove IE11 from browserslist configs
 */
export declare function applyBrowserslistIEFix(rootDir: string): Promise<number>;
/**
 * 5) tsconfig target "es5" → "es2015"
 */
export declare function applyTsTargetModernize(rootDir: string): Promise<number>;
/**
 * 6) CommonJS require() usage — for now, just log.
 * Real auto-fix is complex (convert require → import).
 */
export declare function applyCommonJsReviewNote(_rootDir: string): Promise<void>;
/**
 * 7) AnimationModule.forRoot → provideAnimations()
 */
export declare function applyAnimationModuleFix(rootDir: string): Promise<number>;
/**
 * 8) Remove rxjs-compat
 */
export declare function applyRxjsCompatRemovalFix(rootDir: string): Promise<number>;
/**
 * 9) ModuleWithProviders → ModuleWithProviders<ModuleName>
 */
export declare function applyModuleWithProvidersGenericFix(rootDir: string): Promise<number>;
export declare function applyTypescript56Upgrade(rootDir: string): Promise<number>;
export declare function applyProtractorBuilderReview(rootDir: string): Promise<void>;
