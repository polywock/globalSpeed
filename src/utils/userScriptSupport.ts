// Only one of these two modules is real in any given build; the other resolves to an
// empty module (see browserModules in vite.config.js), so the star exports never clash.
// TypeScript sees both files, hence the suppression.
export * from "notFirefox/utils/userScriptSupportChromium"
// @ts-expect-error - duplicate exports; only one side survives the build.
export * from "isFirefox/utils/userScriptSupportFirefox"
