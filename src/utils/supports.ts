
export const HAS_PIP_API = !!("requestPictureInPicture" in HTMLVideoElement.prototype && "pictureInPictureElement" in Document.prototype)
export const BLOCKS_PIP =  (document as any).featurePolicy?.allowsFeature("picture-in-picture") === false 
export const SUPPORTS_BACKDROP = window.CSS?.supports?.("backdrop-filter: invert(1)")