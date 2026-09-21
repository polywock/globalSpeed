export const IS_DOUYIN = location.hostname === "douyin.com" || location.hostname.endsWith(".douyin.com")

export type DouyinSpeedMessage = { type: "DOUYIN_SPEED"; speed: number | null }
