import { browser } from "webextension-polyfill-ts"

var initTriggered: boolean = false
var currentIndex: number = 0
var previewEnabled: boolean = false
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
        if (postnode.textContent === clickedPostNode!.textContent && extra(idx)) {
            selectIndex(currentIndex, idx)
            currentIndex = idx
            return
        }
    }
}

function extra(idx: number): boolean {
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

Array.from(document.getElementsByClassName('comment')).forEach(
    el => el.addEventListener('click', handleCommentClick, false)
)

Array.from(document.getElementsByClassName('link')).forEach(
    el => el.addEventListener('click', handlePostClick, false)
)

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

document.addEventListener('keypress', async function onPress(event) {
    if (inputFocused()) {return}
    const settings = await browser.storage.sync.get()

    switch (event.key) {
        case settings.opencomments:
            return openComments()
        case settings.togglepreview:
            return togglePreview()
        case settings.togglecollapse:
            return toggleCollapse()
        case settings.incimgsize:
            return changeImageSize(Number(settings.incdecsize))
        case settings.decimgsize:
            return changeImageSize(-1 * Number(settings.incdecsize))
        default:
            break
    }

    let newIndex: number = 0  // Will be changed anyway
    switch (event.key) {
        case settings.nextparent:
            newIndex = goDownParent(currentIndex, parentCommentsIdx)
            break
        case settings.prevparent:
            newIndex = goUpParent(currentIndex)
            break
        case settings.nextall:
            newIndex = goDownChild(currentIndex, allCommentsIdx)
            break
        case settings.prevall:
            newIndex = goUpChild(currentIndex)
            break
        default:
            return
    }
    let shouldToggleAgain = false
    if (previewEnabled) {
        shouldToggleAgain = true
        togglePreview()
    }
    scrollToIndex(currentIndex, newIndex)
    currentIndex = newIndex
    if (shouldToggleAgain) {
        togglePreview()
    }
})

function goDownChild(currentIndex: number, allIndices: number[]): number {
    if (!initTriggered) {
        initTriggered = true
        return currentIndex
    }
    if (currentIndex === allIndices[-1]) {
        return currentIndex
    }
    let tentative = currentIndex + 1
    // if current comment is collapsed (immediate children are invisible),
    // find the next visible comment
    if (invisibleCommentsIdx.has(tentative)) {
        return allCommentsIdx
            .slice(currentIndex + 1)
            .find((idx) => !invisibleCommentsIdx.has(idx))!
    }
    return tentative
}

function goUpChild(currentIndex: number): number {
    if (!initTriggered) {
        initTriggered = true
        return currentIndex
    }
    if (currentIndex === 0) {
        return currentIndex
    }
    const tentative = currentIndex - 1
    // if tentative is invisible, find the previous comment that is visible
    if (invisibleCommentsIdx.has(tentative)) {
        for (let idx of allCommentsIdx.slice(0, currentIndex).reverse()) {
            if (!invisibleCommentsIdx.has(idx)) {
                return idx
            }
        }
    }
    return tentative
}

function goDownParent(currentIndex: number, parentCommentsIdx: number[]) {
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

function goUpParent(currentIndex: number) {
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



function toggleCollapse() {
    let comment = allComments[currentIndex].children[0] as HTMLDetailsElement
    const currentDepth = depths[currentIndex]
    if (comment.open) {
        collapse(currentDepth)
    } else {
        uncollapse()
    }
    comment.open = !comment.open
}

function collapse(currentDepth: number) {
    // Push in every next comment with a greater depth,
    // until meeting a comment with equal depth
    for (const [idx, depth] of depths.slice(currentIndex + 1).entries()) {
        if (depth > currentDepth) {
            let invisIdx = idx + currentIndex + 1
            invisibleCommentsIdx.add(invisIdx)
            // Also register each newly-invisible comment as being
            // hidden by the current comment that's about to be collapsed
            let arr = invisibleComments.get(currentIndex) ?? []
            let newarr = arr.concat([invisIdx])
            invisibleComments.set(currentIndex, newarr)
        } else {
            break
        }
    }
}

function uncollapse() {
    // Remove all comments marked as invisible for the current (collapsed) comment
    invisibleComments.get(currentIndex)?.forEach(
        idx => invisibleCommentsIdx.delete(idx)
    )
    invisibleComments.delete(currentIndex)
    // Add back any comments still invisible because of other collapsed comments
    invisibleComments.forEach(
        indices => indices.map(idx => invisibleCommentsIdx.add(idx))
    )
}

function togglePreview() {
    if (!initTriggered) {
        initTriggered = true
        scrollToIndex(0, 0)
    }
    const entry = getCurrentEntry()
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
    image.style.setProperty('max-height', height.toString() + 'PX', 'important')

    previewEnabled = !previewEnabled
}

function openComments() {
    const entry = getCurrentEntry()
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


function changeImageSize(by: number) {
    const entry = getCurrentEntry()
    const meta = searchByClass(entry.children, 'meta')
    const links = searchByClass(meta.children, 'links')
    const container = searchByTag(links.children, 'details')
    let image = searchByClass(
        container.children, 'preview'
    ).children[0] as HTMLCanvasElement
    const new_height = image.height + by
    image.style.setProperty(
        'max-height', new_height.toString() + 'px', 'important'
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

function getCurrentEntry() {
    if (isUserPage()) {
        return allComments[currentIndex].children[2]
    }
    return allComments[currentIndex]
}
