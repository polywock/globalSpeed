
import { getStoredSalt, hashWithStoredSalt } from "src/utils/hash"
import { IS_SMART } from "./isWebsite"

export class SmartFs {
  private lock: Element
  private operationLock: boolean
  constructor() {
    gvar.os.eListen.fsCbs.add(this.handleFullscreenChange)
  }
  release = () => {
    gvar.os.eListen.fsCbs.delete(this.handleFullscreenChange)
  }
  handleFullscreenChange = (e: Event) => {
    if (!chrome.runtime?.id) return gvar.os.handleOrphan()
    if (this.lock) {
      if (document.fullscreenElement && (this.lock.getRootNode() as Document).fullscreenElement === this.lock) {
        return 
      } else {
        this.lock = null 
      }
    }

    document.fullscreenElement && this.attemptIntegration()
  }
  attemptIntegration = async () => {
    if (!document.fullscreenElement || document.fullscreenElement instanceof HTMLVideoElement)  return 
    let matches = [...gvar.os.mediaTower.media].filter(m => m.readyState && m instanceof HTMLVideoElement && (m as HTMLVideoElement).videoWidth && m.isConnected).map(m => findFullscreenAncestor(m)).filter(v => v);

    // if more than one video child of the fullscreen element, cull it.
    if (matches.length > 1) {
      matches = matches
        .filter(m => (m.child as HTMLVideoElement).intersectionRatio)
        .sort((a, b) => (b.child as HTMLVideoElement).intersectionRatio - (a.child as HTMLVideoElement).intersectionRatio)
        .slice(0, 1)
    }

    // if multiple media is fullscreen, ignore. 
    if (matches.length !== 1) return 

    // generate profile. 
    const profile = await generateFsProfile(matches[0])
    
    // integrate new profile. 
    profile && (await integrateProfile(profile))
  }
  toggleSafe = async (video: HTMLVideoElement) => {
    if (this.operationLock) return 
    
    this.operationLock = true 
    await this.toggle(video).finally(() => {
      delete this.operationLock
    })
  }
  toggle = async (video: HTMLVideoElement) => {
    // if fullscreen, exit. 
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return 
    }
    // video must meet minimum requirements
    if (!(IS_SMART && video?.isConnected && video.readyState && video.videoWidth)) return 
    // look for quality profile. 
    const profile = await findPrimeProfile(video, 0.5)

    // if no qualified profile found, try native fullscreen. 
    if (!profile) {
      await gvar.os.nativeFs.toggleSafe(video)
      return 
    }

    // enter fullscreen
    await profile.ancestor.requestFullscreen()
    this.lock = profile.ancestor
  }
}

export function getAncestor(node: Node, n: number) {
  let current = node
  for (let i = 0; i < n; i++) {
    current = current.parentNode || (current as ShadowRoot).host
    if (!current) return 
  }
  return current 
}

export function getFullscreenRootNode(child: Node) {
  if (!child) return


  let latest = child 
  while (true) {
    let rootNode = (latest?.getRootNode() as Document | ShadowRoot)
    if (!rootNode) return 
    if (rootNode.fullscreenElement) return rootNode
    if (rootNode instanceof ShadowRoot) {
      latest = rootNode.host
    } else {
      return  
    }
  }
}

export function getAncestorDistance(ancestor: Node & ParentNode, child: Node) {
  if (!ancestor || !child) return

  let distance = 0
  let latest = child 
  while (true) {
    latest = latest?.parentNode || (latest as ShadowRoot)?.host 
    distance++
    if (!latest) return 
    if (latest === ancestor) return {ancestor, distance, child}
  }
}

export function findFullscreenAncestor(child: Node) {
  if (!child) return

  let ancestor = getFullscreenRootNode(child)?.fullscreenElement
  if (!ancestor || ancestor === child) return 

  return getAncestorDistance(ancestor, child)
}

export type FsProfile = {
  created: number,
  distance: number, 
  videoId: string,
  videoClassNames: string[],
  videoAttributes: string[],
  parentId: string,
  parentTag: string,
  parentClassNames: string[],
  parentAttributes: string[],
  slashes: string[],
  maxScore?: number,
}


export function fsAffinity(lhs: FsProfile, rhs: FsProfile) {
  if (lhs.distance !== rhs.distance) return -Infinity
  if (lhs.parentTag !== rhs.parentTag) return -Infinity
  
  let score = 0

  new Set([...lhs.videoAttributes, ...rhs.videoAttributes]).forEach(v => {
    score += (lhs.videoAttributes.includes(v) && rhs.videoAttributes.includes(v)) ? 10 : -10
  })

  new Set([...lhs.parentAttributes, ...rhs.parentAttributes]).forEach(v => {
    score += (lhs.parentAttributes.includes(v) && rhs.parentAttributes.includes(v)) ? 10 : -10
  })

  new Set([...lhs.videoClassNames, ...rhs.videoClassNames]).forEach(v => {
    score += (lhs.videoClassNames.includes(v) && rhs.videoClassNames.includes(v)) ? 10 : 0
  })

  new Set([...lhs.parentClassNames, ...rhs.parentClassNames]).forEach(v => {
    score += (lhs.parentClassNames.includes(v) && rhs.parentClassNames.includes(v)) ? 10 : 0
  })

  score += lhs.videoId === rhs.videoId ? (lhs.videoId ? 25 : 10) : 0
  score += lhs.parentId === rhs.parentId ? (lhs.parentId ? 25 : 10) : 0

  if (lhs.slashes[0] && rhs.slashes[0])  {
    score += lhs.slashes[0] === rhs.slashes[0] ? 25 : 0
  }

  if (lhs.slashes[1] && rhs.slashes[1])  {
    score += lhs.slashes[1] === rhs.slashes[1] ? 10 : 0
  }

  return score 
}


export async function generateFsProfile({distance, child, ancestor}: ReturnType<typeof findFullscreenAncestor>): Promise<FsProfile> {
  let slashes = [] as string[]
  let pathName = (document?.location?.pathname || "").substr(1)
  if (pathName) {
    slashes = pathName.split("/").slice(0, 3)
  }
  
  let keysToHash = ['videoId', 'parentId', 'parentTag'] as const
  let arrayKeysToHash = ['videoClassNames', 'videoAttributes', 'parentClassNames', 'parentAttributes', 'slashes'] as const

  const profile: FsProfile = {
    created: Date.now(),
    distance,
    videoId: (child as Element)?.id || null,
    videoClassNames: [...(child as Element)?.classList || []],
    videoAttributes: (child as Element)?.getAttributeNames() ?? [],
    parentId: (ancestor as Element).id  || null,
    parentTag: (ancestor as Element).tagName,
    parentClassNames: [...(ancestor as Element)?.classList || []],
    parentAttributes: (ancestor as Element)?.getAttributeNames() ?? [],
    slashes
  }

  await getStoredSalt()
  await Promise.all([
    ...keysToHash.map(async key => {
      if (profile[key]) profile[key] = await hashWithStoredSalt(profile[key])
    }),
    ...arrayKeysToHash.map(async key => {
      if (!profile[key]?.length) return 

      await Promise.all(profile[key].map(async (v, i) => {
        profile[key][i] = await hashWithStoredSalt(v)
      }))
    })
  ])

  profile.maxScore = fsAffinity(profile, profile)
  return profile 
}


export async function getProfiles(): Promise<{profiles: FsProfile[], key: string}> {
  await getStoredSalt()
  const key = `f:fs:${await hashWithStoredSalt(location.hostname)}`
  const profiles = (await chrome.storage.local.get(key))[key] || []
  return { key, profiles }
}


export async function integrateProfile(newProfile: FsProfile, mergeThreshold = 0.5) {
  // get existing profiles 
  let { profiles, key } = await getProfiles()
  
  // clear expired profiles 
  profiles = profiles.filter(v => v.created > Date.now() - 864E5 * 90)

  // get profile with highest affinity to our new profile. 
  let sorted = profiles.map(v => ({profile: v, score: fsAffinity(v, newProfile)})).sort((a, b) => b.score - a.score)
  let prime = sorted[0]

  // If prime profile similar enough, swap with new profile. 
  if (prime?.score > 0 && prime.score / newProfile.maxScore > (mergeThreshold ?? 0.5)) {
    let primeIndex = profiles.indexOf(prime.profile)
    if (primeIndex >= 0) {
      profiles.splice(primeIndex, 1)
    } 
  } 
  profiles.unshift(newProfile)

  // persist into local storage. 
  chrome.storage.local.set({[key]: profiles.slice(0, 10)})
}


export async function findPrimeProfile(child: Node, primeThreshold = 0.5): Promise<{profile: FsProfile, ancestor: Element}> {
  
  // get profiles 
  let { profiles } = await getProfiles()

  const scores = await Promise.all(profiles.map(profile => compareToProfile(child, profile)))
  let peakScore: (typeof scores)[number]

  scores.filter(score => score.score / score.profile.maxScore > primeThreshold).forEach(score => {
    if (!peakScore || score.score > peakScore.score) {
      peakScore = score 
    }
  })

  return peakScore
}

export async function compareToProfile(child: Node, profile: FsProfile) {

  // find potential ancestor. 
  let ancestor = getAncestor(child, profile.distance)
  if (!(ancestor instanceof Element)) return 

  // generate psuedo profile based on potential ancestor. 
  const pseudoProfile = await generateFsProfile({distance: profile.distance, child, ancestor})

  const score = fsAffinity(pseudoProfile, profile)
  return {profile, score, ancestor} 
}