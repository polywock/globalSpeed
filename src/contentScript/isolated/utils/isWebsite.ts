


export let IS_NETFLIX = false
export let IS_AMAZON = false
export let IS_BILIBILI = false
export let IS_YOUTUBE = false
export let IS_VIMEO = false
export let IS_REDDIT = false
export let IS_FACEBOOK = false

if ((document.URL || "").startsWith("https://www.netflix.com")) {
    IS_NETFLIX = true 
} else if ((document.URL || "").startsWith("https://www.amazon")) {
    IS_AMAZON = true 
} else if (location.hostname === "www.bilibili.com") {
    IS_BILIBILI = true 
} else if (location.hostname === "www.youtube.com") {
    IS_YOUTUBE = true 
} else if (location.hostname === "vimeo.com") {
    IS_VIMEO = true 
} else if (location.hostname.endsWith("reddit.com")) {
    IS_REDDIT = true 
} else if (location.hostname.endsWith("facebook.com")) {
    IS_FACEBOOK = true 
}

export const IS_SPECIAL_SEEK = IS_NETFLIX || IS_AMAZON
export const IS_NATIVE = !(IS_NETFLIX || IS_FACEBOOK)
export const IS_SMART = !(IS_VIMEO || IS_REDDIT)

