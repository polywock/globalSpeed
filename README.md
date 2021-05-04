# Global Speed
Web extension that sets a default speed for HTML media elements (video and audio). 

## Install the [Chrome](https://chrome.google.com/webstore/detail/global-speed-youtube-netf/jpbjcnkcffbooppibceonlgknpkniiff), [Firefox](https://addons.mozilla.org/firefox/addon/global-speed/), or [Edge](https://microsoftedge.microsoft.com/addons/detail/mjhlabbcmjflkpjknnicihkfnmbdfced) extension. 

### Speed Control 
- Compatible with nearly all video and audio streaming sites including Youtube, Netflix, Twitch, Spotify, podcast sites, etc. 
- If pinned, tabs can have their own playback rate.
- URL rules to automatically set a custom playback rate depending on the website. 
- Optional shortcut keys to control speed. 

### Media Hotkeys 
- Rewinding/forwarding, frame by frame analysis, adjusting volume, set mark, go to mark, AB repeating, and more. 
- Select what video/audio you want prioritized for media hotkeys. 
- Hotkeys can be in global mode, which allows you to control background music or PiP videos while using another program. **[Chromium only]**

### Filters 
- Apply filters (invert, grayscale, brightness, contrast, mirroring etc) on videos or even the entire page. 
- Optionals hotkeys to toggle invert/grayscale, adjust brightness/contrast, and more. 

### Audio Effects [Chromium Only]
- Effects including pitch shifting, volume boosting, EQ, and more. 
- Reverse audio to listen to [backmasked messages](https://en.wikipedia.org/wiki/List_of_backmasked_messages).
- You can delay audio to fix sync issues. 
- Configure hotkeys to adjust pitch, volume boost, and more. 


<img src="https://github.com/polywock/globalSpeed/blob/master/static/screenshot.png?raw=true" width="600">

## Build 
1. `npm install` to install required dependencies. 
1. `npm run build:dev` build unpacked version. 
1. Load the unpacked folder
   1. Chrome: open extensions page, enable dev mode, load unpacked. 
   1. Edge: open extensions page, load unpacked.
