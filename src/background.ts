import { browser } from "webextension-polyfill-ts"

browser.runtime.onMessage.addListener(
    (message: {url: string}) => browser.tabs.create({
        url: message.url, active: false
    })
)
