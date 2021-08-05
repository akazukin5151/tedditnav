import { browser } from "webextension-polyfill-ts"
import { goUpChild, goDownChild } from './motion'
import { collapse, uncollapse } from './collapsing'


let initTriggered: boolean = false
let currentIndex: number = 0
let previewEnabled: boolean = false
// Tracks which collapsed comment is making which comments invisible
let invisibleComments: Map<number, number[]> = new Map()
// Tracks only the positions of the invisible comments
let invisibleCommentsIdx: Set<number> = new Set()
const [
    allComments, allCommentsIdx, parentCommentsIdx, depths
] = getAllElementsFlattened()


function isUserPage() {
    return document.URL.includes('/u/')
}

function abstractHandlePostClick(
    event: Event,
    classNameMatches: (clicked: Element) => boolean,
    processor: (post: Element) => Element
) {
    let clickedPost = event!.target as Element
    while (!classNameMatches(clickedPost)) {
        clickedPost = (<Node>clickedPost!).parentElement!!
    }
    clickedPost = processor(clickedPost)
    for (const [idx, post] of allComments.entries()) {
        let postnode = post as Node
        let clickedPostNode = clickedPost as Node
        if (
            postnode.textContent === clickedPostNode!.textContent
            && extra(currentIndex, idx)
        ) {
            selectIndex(currentIndex, idx)
            currentIndex = idx
            return
        }
    }
}

function extra(currentIndex: number, idx: number): boolean {
    return isUserPage()
           ? true
           : currentIndex !== idx
}

function handleCommentClick(event: Event) {
    const classname = isUserPage() ? 'commententry' : 'comment'
    return abstractHandlePostClick(
        event,
        (clicked) => clicked.className.includes(classname),
        (x) => x,
    )
}

function handlePostClick(event: Event) {
    return abstractHandlePostClick(
        event,
        (clicked) => clicked.className === 'link',
        isUserPage()
            ? (x) => x
            : (x) => x.children[2]
    )
}

function inputFocused() {
    const active = document.activeElement as HTMLInputElement
    try {
        if (active.type === 'text') {
            return true
        }
    } catch {
        // Ignore
    }
    return false
}

async function onPress(
    event: KeyboardEvent
) {
    if (inputFocused()) {
        return
    }
    const settings = await browser.storage.sync.get()

    switch (event.key) {
        case settings.opencomments:
            return openComments(currentIndex)
        case settings.togglepreview:
            previewEnabled = togglePreview(initTriggered, currentIndex, previewEnabled)
            return
        case settings.togglecollapse:
            return toggleCollapse(
                allComments, currentIndex, invisibleComments, invisibleCommentsIdx
            )
        case settings.incimgsize:
            return changeImageSize(currentIndex, Number(settings.incdecsize))
        case settings.decimgsize:
            return changeImageSize(currentIndex, -1 * Number(settings.incdecsize))
        default:
            break
    }

    let newIndex: number = 0  // Will be changed anyway
    switch (event.key) {
        case settings.nextparent:
            newIndex = goDownParent(initTriggered, currentIndex, parentCommentsIdx)
            break
        case settings.prevparent:
            newIndex = goUpParent(initTriggered, currentIndex)
            break
        case settings.nextall:
            newIndex = goDownChild(
                initTriggered, currentIndex, invisibleCommentsIdx,
                allCommentsIdx
            )
            break
        case settings.prevall:
            newIndex = goUpChild(
                initTriggered, currentIndex, invisibleCommentsIdx, allCommentsIdx
            )
            break
        default:
            return
    }
    if (!initTriggered) {
        initTriggered = true
    }
    let shouldToggleAgain = false
    if (previewEnabled) {
        shouldToggleAgain = true
        previewEnabled = togglePreview(initTriggered, currentIndex, previewEnabled)
    }
    scrollToIndex(currentIndex, newIndex)
    currentIndex = newIndex
    if (shouldToggleAgain) {
        previewEnabled = togglePreview(initTriggered, currentIndex, previewEnabled)
    }
}


function goDownParent(
    initTriggered: boolean, currentIndex: number, parentCommentsIdx: number[]
) {
    if (!initTriggered) {
        initTriggered = true
        return currentIndex
    }
    if (currentIndex >= parentCommentsIdx[-1]) {
        return currentIndex
    }
    if (parentCommentsIdx.includes(currentIndex)) {
        return parentCommentsIdx[parentCommentsIdx.indexOf(currentIndex) + 1]
            || currentIndex
    }
    return parentCommentsIdx.find(idx => idx >= currentIndex) || currentIndex
}

function goUpParent(initTriggered: boolean, currentIndex: number) {
    if (!initTriggered) {
        initTriggered = true
        return currentIndex
    }
    if (currentIndex === 0) {
        return currentIndex
    }
    if (parentCommentsIdx.includes(currentIndex)) {
        return parentCommentsIdx[parentCommentsIdx.indexOf(currentIndex) - 1]
    }
    // Else: in a child comment, look for previous parent comment
    return parentCommentsIdx.slice().reverse().find(idx => idx < currentIndex)
        || currentIndex
}

function scrollToIndex(oldIndex: number, newIndex: number) {
    allComments[newIndex].scrollIntoView()
    selectIndex(oldIndex, newIndex)
}

function selectIndex(oldIndex: number, newIndex: number) {
    let e1 = allComments[newIndex] as HTMLElement
    e1.style.backgroundColor = '#e0edfc'
    if (oldIndex !== newIndex) {
        let e2 = allComments[oldIndex] as HTMLElement
        e2.style.backgroundColor = ''
    }
}


function getAllElementsFlattened(): [Element[], number[], number[], number[]] {
    if (isUserPage()) {
        return getUserElements()
    }
    const posts = document.querySelectorAll('.entry')
    if (posts.length === 0) {
        return allCommentsFlattened()
    } else {
        const indices = [...Array(posts.length).keys()]
        const depths = Array(posts.length).fill(0)
        return [Array.from(posts), indices, indices, depths]
    }
}

function getUserElements(): [Element[], number[], number[], number[]]  {
    let entries = Array.from(document.querySelectorAll('.entries')[0].children)
    entries = entries.slice(0, entries.length - 2)
    const indices = [...Array(entries.length).keys()]
    const depths = Array(entries.length).fill(0)
    return [entries, indices, indices, depths]
}

function allCommentsFlattened(): [Element[], number[], number[], number[]]  {
    let comments = []
    let parentIndices = []
    let depths = []
    const parentComments = document.querySelectorAll('.comments')[0].children
    for (const comment of parentComments) {
        comments.push(comment)
        depths.push(0)
        parentIndices.push(comments.length - 1)
        const [rec_comments, rec_depths] = getAllChildComments(comment, 0)
        comments.push(...rec_comments)
        depths.push(...rec_depths)
    }
    const indices = [...Array(comments.length).keys()]
    return [Array.from(comments), indices, parentIndices, depths]
}

function getAllChildComments(
    parentComment: Element, currentDepth: number
): [Element[], number[]] {
    const thisComment = parentComment.children[0].children
    let comments = []
    let depths = []
    for (const el of thisComment) {
        if (el.className.includes('comment')) {
            comments.push(el)
            depths.push(currentDepth + 1)
            // extend the comments array with child comments
            const [rec_comments, rec_depths] = getAllChildComments(el, currentDepth + 1)
            comments.push(...rec_comments)
            depths.push(...rec_depths)
        }
    }
    return [Array.from(comments), depths]
}


function toggleCollapse(
    allComments: Element[],
    currentIndex: number,
    invisibleComments: Map<number, number[]>,
    invisibleCommentsIdx: Set<number>
) {
    let comment = allComments[currentIndex].children[0] as HTMLDetailsElement
    const currentDepth = depths[currentIndex]
    if (comment.open) {
        collapse(
            currentIndex, invisibleComments, invisibleCommentsIdx, currentDepth,
            depths
        )
    } else {
        uncollapse(invisibleComments, currentIndex, invisibleCommentsIdx)
    }
    comment.open = !comment.open
}

function togglePreview(
    initTriggered: boolean, currentIndex: number, previewEnabled: boolean
) {
    if (!initTriggered) {
        initTriggered = true
        scrollToIndex(0, 0)
    }
    const entry = getCurrentEntry(currentIndex)
    const meta = searchByClass(entry.children, 'meta')
    const links = searchByClass(meta.children, 'links')
    let container = searchByTag(links.children, 'details') as HTMLDetailsElement
    container.open = !container.open
    // In case if the preview is at the bottom of the page
    entry.scrollIntoView()

    // Resize the image to fit the browser screen
    let image =
        searchByClass(container.children, 'preview').children[0] as HTMLElement
    const height = document.documentElement.clientHeight
        - searchByClass(entry.children, 'title').clientHeight
        - searchByClass(meta.children, 'submitted').clientHeight
        - searchByClass(container.children, 'summary').clientHeight
    image.style.setProperty('max-height', height.toString() + 'px', 'important')

    return !previewEnabled
}

function openComments(currentIndex: number) {
    const entry = getCurrentEntry(currentIndex)
    const meta = searchByClass(entry.children, 'meta')
    let comments
    if (meta) {
        const links = searchByClass(meta.children, 'links')
        comments = searchByClass(links.children, 'comments') as HTMLAnchorElement
    } else {
        const title = searchByClass(entry.children, 'title')
        const meta = searchByClass(title.children, 'meta')
        comments = searchByClass(meta.children, 'comments') as HTMLAnchorElement
    }
    browser.runtime.sendMessage({"url": comments.href})
}


function changeImageSize(currentIndex: number, by: number) {
    const entry = getCurrentEntry(currentIndex)
    const meta = searchByClass(entry.children, 'meta')
    const links = searchByClass(meta.children, 'links')
    const container = searchByTag(links.children, 'details')
    let image = searchByClass(
        container.children, 'preview'
    ).children[0] as HTMLCanvasElement
    const new_height = image.height + by
    image.style.setProperty(
        'max-height', new_height.toString() + 'PX', 'important'
    )
}

function searchByClass(elements: HTMLCollection, name: string): Element {
    let elems: Element[] = Array.from(elements)
    for (const element of elems) {
        if (element.className === name || element.localName === name) {
            return element
        }
    }
    throw `${elements} does not contain a class called ${name}`
}

function searchByTag(elements: HTMLCollection, name: string): Element {
    let elems: Element[] = Array.from(elements)
    for (const element of elems) {
        if (element.localName === name) {
            return element
        }
    }
    throw `${elements} does not contain a tag called ${name}`
}

function getCurrentEntry(currentIndex: number) {
    if (isUserPage()) {
        return allComments[currentIndex].children[2]
    }
    return allComments[currentIndex]
}

function main() {
    Array.from(document.getElementsByClassName('comment')).forEach(
        el => el.addEventListener(
            'click', handleCommentClick, false
        )
    )

    Array.from(document.getElementsByClassName('link')).forEach(
        el => el.addEventListener(
            'click', handlePostClick, false
        )
    )

    document.addEventListener('keypress', onPress)
}
main()
