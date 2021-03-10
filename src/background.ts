import { browser } from "webextension-polyfill-ts"

browser.runtime.onMessage.addListener(
    (message: any) => browser.tabs.create({url: message.url, active: false})
)
