function unwrapOr(nullable: any, default_: string) {
    return nullable ? nullable.value : default_
}

function saveOptions(event: Event) {
    event.preventDefault();
    //@ts-ignore
    browser.storage.sync.set({
        prevparent: unwrapOr(document.querySelector("#prevparent"), 'w'),
        nextparent: unwrapOr(document.querySelector("#nextparent"),'s'),
        prevall: unwrapOr(document.querySelector("#prevall"),'r'),
        nextall: unwrapOr(document.querySelector("#nextall"),'f'),
        opencomments: unwrapOr(document.querySelector("#opencomments"), 'o'),
        togglepreview: unwrapOr(document.querySelector("#togglepreview"), 'x'),
        togglecollapse: unwrapOr(document.querySelector("#togglecollapse"),'q'),
    });
}

function getKey(result: any, setting: string) {
    if (typeof result === 'string') {
        return result
    }
    return result[setting] || ''
}

function onSuccess(result: any, setting: string) {
    let field: any = document.querySelector(`#${setting}`)
    if (field) {
        field.value = getKey(result, setting)
    }
}

function onError(error: any) {
    console.log(`Error: ${error}`)
}

function restoreOptions() {
    const settings = [
        'prevparent', 'nextparent', 'prevall', 'nextall',
        'opencomments', 'togglepreview', 'togglecollapse'
    ]
    for (const setting of settings) {
        //@ts-ignore
        browser.storage.sync.get(setting).then(
            (r: any) => onSuccess(r, setting),
            onError
        )
    }
}

document.addEventListener("DOMContentLoaded", restoreOptions);
let form = document.querySelector("form")
if (form) {
    form.addEventListener("submit", saveOptions);
}