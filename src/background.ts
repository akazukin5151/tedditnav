//@ts-ignore
browser.runtime.onMessage.addListener(
    //@ts-ignore
    message => browser.tabs.create({url: message.url, active: false})
)
