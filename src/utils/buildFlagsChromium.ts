// Annotated as boolean rather than left to literal inference, so TypeScript never treats the
// other build's branches as unreachable. Bundlers still fold these away per build.
export const IS_CHROME_BUILD: boolean = true
export const IS_FIREFOX_BUILD: boolean = false
