import { browser } from "webextension-polyfill-ts"

function unwrapOr(nullable: any, default_: string) {
    return nullable ? nullable.value : default_
}

function setOrDefault<V>(map: Map<string, V>, name: string, default_: string) {
    map.set(name, unwrapOr(document.querySelector('#' + name), default_))
}

function saveOptions(event: Event) {
    event.preventDefault()
    let map = new Map()
    setOrDefault(map, 'prevparent', 'w')
    setOrDefault(map, 'nextparent', 's')
    setOrDefault(map, 'prevall', 'r')
    setOrDefault(map, 'nextall', 'f')
    setOrDefault(map, 'opencomments', 'c')
    setOrDefault(map, 'togglepreview', 'x')
    setOrDefault(map, 'togglecollapse', 'q')
    setOrDefault(map, 'incimgsize', '=')
    setOrDefault(map, 'decimgsize', '-')
    setOrDefault(map, 'incdecsize', '30')
    browser.storage.sync.set(map)
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
        'opencomments', 'togglepreview', 'togglecollapse', 'incimgsize', 'decimgsize',
        'incdecsize'
    ]
    for (const setting of settings) {
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
