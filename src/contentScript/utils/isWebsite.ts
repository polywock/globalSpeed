

export const IS_NETFLIX = (document.URL || "").startsWith("https://www.netflix.com")
export const IS_AMAZON = (document.URL || "").startsWith("https://www.amazon")
export const IS_SPECIAL_SEEK = IS_NETFLIX || IS_AMAZON
export const IS_BILIBILI = location.hostname === "www.bilibili.com"
export const IS_VIMEO = location.hostname === "vimeo.com"
export const IS_REDDIT = location.hostname.endsWith("reddit.com")

export const IS_NATIVE = !(IS_NETFLIX)
export const IS_SMART = !(IS_VIMEO || IS_REDDIT)
