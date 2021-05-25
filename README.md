# tedditnav

Add basic keyboard navigation to teddit.net

Based on [RES](https://github.com/honestbleeps/Reddit-Enhancement-Suite)

teddit is an open source frontend for reddit (like invidio and nitter)

## Features
1. Go up/down posts, parent comments, and child comments
2. Toggle image preview
3. Toggle comment collapse
4. Open comment in new background tab
5. Adjust size of image preview

## Install

1. Download from `https://addons.mozilla.org/addon/tedditnav/`
2. Go to `about:addons -> tedditnav -> Preferences` and enter your key bindings then save it
3. Go to `teddit.net` and enjoy

## Develop
1. Git clone
2. Install the dependencies (typescript, webpack, and webextension-polyfill-ts) with `npm ci`
3. Build with `npx webpack --mode=production` for release or `npx webpack --mode=development` for eval-source-map debugging

Note that eval-source-map doesn't work for background.ts because CSP blocks eval calls. The exclude option for EvalSourceMapDevToolPlugin doesn't work either. Either copy in the production version or use another devtool option. The debugger isn't really needed for background.ts, but it prevents the preferences page from reading stored settings

## Privacy

- No tracking, does not send anything to anywhere
- Free and open source - reading the source code is highly recommended. It's only ~300 lines, and if I can write typescript without knowing it, then you can understand it without knowing it.
- Only permission requested is storage, to store user key bindings
