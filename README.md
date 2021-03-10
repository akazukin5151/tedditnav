Adds basic keyboard navigation to teddit.net

Based on [RES](https://github.com/honestbleeps/Reddit-Enhancement-Suite)

teddit is an open source frontend for reddit (like invidio and nitter)

1. Git clone
2. Install the dependencies (typescript, webpack, and webextension-polyfill-ts) with `npm ci`
3. Build with `npx webpack --mode=production` for release or `npx webpack --mode=development` for eval-source-map debugging

Note that eval-source-map doesn't work for background.ts because CSP blocks eval calls. The exclude option for EvalSourceMapDevToolPlugin doesn't work either. Either copy in the production version or use another devtool option. The debugger isn't really needed for background.ts, but it prevents the preferences page from reading stored settings
