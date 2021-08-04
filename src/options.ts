import { browser } from "webextension-polyfill-ts"

function unwrapOr(nullable: HTMLInputElement | null, default_: string): string {
    return nullable ? nullable.value : default_
}

function setOrDefault(map: Map<string, string>, name: string, default_: string) {
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
    browser.storage.sync.set(Object.fromEntries(map))
}

function onSuccess(result: { [i: string]: string }, setting: string) {
    let field: HTMLInputElement | null = document.querySelector(`#${setting}`)
    if (field) {
        field.value = result[setting]
    }
}

function onError(error: Error) {
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
            // object indexed with string, giving a string
            // like Map<string, string>
            (r: { [i: string]: string }) => onSuccess(r, setting),
            onError
        )
    }
}

document.addEventListener("DOMContentLoaded", restoreOptions)
document.querySelector("form")?.addEventListener("submit", saveOptions)
