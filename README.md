# Global Speed
Web extension that sets a default speed for HTML media elements (video and audio). 

To use, install the [Chrome](https://chrome.google.com/webstore/detail/global-speed-youtube-netf/jpbjcnkcffbooppibceonlgknpkniiff?hl=en), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/global-speed/), or [Edge](https://microsoftedge.microsoft.com/addons/detail/mjhlabbcmjflkpjknnicihkfnmbdfced) extension. 

## Features
- Hotkeys (and way to customize them). 
- Pinning (apply custom playback rate to a specific tab).
- Fx: apply filters (invert, grayscale, etc) on the entire page or select elements. 

<img src="https://github.com/polywock/globalSpeed/blob/master/assets/screenshot_a.jpg?raw=true" width="600">

## Build 
1. `npm install` to install required dependencies. 
1. `npm run build:dev` build unpacked version. 
1. Load the unpacked folder
   1. Chrome: open extensions page, enable dev mode, load unpacked. 
   1. Edge: open extensions page, load unpacked.

## Release Notes

### V2.5.X
- Feature: Support for hidden audio elements. 
   - Support for Spotify, Amazon Music, NPR, and many other music and podcast streaming sites.

### V2.4.X
- Performance: Suspend extension if tab is not visible. 
- Performance: Switched to Mutation Observer API. 
- Performance: Improved performance for shadow documents. 
   - Now the default behavior, formally was an optional feature called recursive mode. 
- Feature: Seeking hotkeys will now work on Netflix. 

### V2.3.X 
- Feature: Full hotkey editor.  
- Feature: Recursive mode, apply speed to videos inside of shadow documents. Slower, but compatible with more sites like AppleTV+. 
- Feature: Fx support, apply fillters (invert, grayscale, etc) to the entire page or select elements (video, img, etc).  

### V2.0
- Feature: basic hotkey support. 
- Feature: pinning (each tab can have it's own speed.)