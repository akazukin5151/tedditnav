import { browser } from "webextension-polyfill-ts"

async function createTab(message: {url: string}) {
    const index: number = await browser.tabs.query(
        {currentWindow: true, active: true}
    ).then(tabs => tabs[0].index)
    browser.tabs.create({
        url: message.url, active: false, index: index + 1
    })
}

browser.runtime.onMessage.addListener(createTab)
