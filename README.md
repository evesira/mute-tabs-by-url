# mute-tabs-by-url
A Chrome extension that automatically mutes tabs based on their url using a black list or a white list, and several other useful muting controls.

[Get it on the Chrome Webstore](https://chrome.google.com/webstore/detail/mute-tabs-by-url/bpokcenamldgbghabnklpmbkkcgcgdld)

## Features

- Automatically mute tabs based on their url using a black list or a white list
- Panic "mute all" button
- Pause extension button
- List entries can have multiple keywords; keywords can have exclusion operator
- Manually un/mute specific tab
- Changeable keyboard shortcuts for all controls
- Option to always keep in-focus tab unmuted
- Option to always keep all tabs except in-focus tab muted
- Functions to quickly add/remove current url to/from list
- Settings synced across Chrome devices
- Works offline; no hotlinked css/js/images/fonts/etc
- Uses pure ("vanilla") Javascript; no third-party libraries/trackers/etc

**Note** While I believe this code is stable and clean, the patterns used are not best practice.
A more basic approach to JavaScript was taken for efficiency of time, and for better readability (so anyone could check the code and understand exactly what it does, and know that it doesn't steal their data).
