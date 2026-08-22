// Which browser this bundle was built for, decided at build time rather than sniffed from
// the user agent. Only one of these two modules is real in any given build; the other
// resolves to an empty module (see browserModules in vite.config.js), so the star exports
// never clash. TypeScript sees both files, hence the suppression.
export * from "notFirefox/utils/buildFlagsChromium"
// @ts-expect-error - duplicate exports; only one side survives the build.
export * from "isFirefox/utils/buildFlagsFirefox"
