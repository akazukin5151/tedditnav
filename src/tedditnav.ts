import { browser } from "webextension-polyfill-ts"

var initTriggered: boolean = false
var currentIndex: number = 0
var previewEnabled: boolean = false
var collapsedIndicesRoots: Set<number> = new Set()
var allCollapsedIndices: Set<number> = new Set()
const [
    allComments, allCommentsIdx, parentCommentsIdx, depths
] = getAllElementsFlattened()

function handleCommentClick(event: any) {
    let clickedComment = event.target
    while (!clickedComment.className.includes('comment')) {
        clickedComment = clickedComment.parentElement
    }
    // classList doesn't contain odd or even depth
    if (clickedComment.classList.length < 2) {
        // This is a user page not a comment page
        // In a user page, allComments collects elements with class `entry` instead
        while (clickedComment.className !== 'entry') {
            clickedComment = clickedComment.parentElement
        }
    }
    for (const [idx, comment] of allComments.entries()) {
        if (comment.textContent === clickedComment.textContent && currentIndex !== idx) {
            selectIndex(currentIndex, idx)
            currentIndex = idx
            break
        }
    }
}

Array.from(document.getElementsByClassName('comment')).forEach(
    el => el.addEventListener('click', handleCommentClick, false)
)

function abstractHandlePostClick(
    event: any,
    className: string,
    processor: (post: any) => any,
) {
    let clickedPost = event.target
    while (!(clickedPost.className === className)) {
        clickedPost = clickedPost.parentElement
    }
    clickedPost = processor(clickedPost)
    for (const [idx, post] of allComments.entries()) {
        if (post.textContent === clickedPost.textContent && currentIndex !== idx) {
            selectIndex(currentIndex, idx)
            currentIndex = idx
            break
        }
    }
}

function handlePostClick(event: any) {
    return abstractHandlePostClick(event, 'link', (post) => post.children[2])
}

Array.from(document.getElementsByClassName('link')).forEach(
    el => el.addEventListener('click', handlePostClick, false)
)

function handleUserPostClick(event: any) {
    return abstractHandlePostClick(event, 'entry t3', (x) => x)
}

Array.from(document.getElementsByClassName('entry t3')).forEach(
    el => el.addEventListener('click', handleUserPostClick, false)
)

function checkIfInput() {
    const active: any = document.activeElement
    try {
        if (active.type === 'text') {
            return true
        }
    } catch {
        // Ignore
    }
    return false
}

function storageGetAll() {
    return browser.storage.sync.get()
}

document.addEventListener('keypress', async function onPress(event) {
    if (checkIfInput()) {return}
    const settings = await storageGetAll()

    switch (event.key) {
        case settings.opencomments:
            return openComments()
        case settings.togglepreview:
            return togglePreview()
        case settings.togglecollapse:
            return toggleCollapse()
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

function goDownChild(currentIndex: number, allIndices: number[]) {
    if (!initTriggered) {
        initTriggered = true
        return currentIndex
    }
    if (currentIndex === allIndices[-1]) {
        return currentIndex
    }
    if (collapsedIndicesRoots.has(currentIndex)) {
        // Find the next comment not collapsed
        return allCommentsIdx
            .slice(currentIndex + 1)
            .find((idx) => !allCollapsedIndices.has(idx))
    }
    return currentIndex + 1
}

function goUpChild(currentIndex: number) {
    if (!initTriggered) {
        initTriggered = true
        return currentIndex
    }
    if (currentIndex === 0) {
        return currentIndex
    }
    const tenatative = currentIndex - 1
    if (collapsedIndicesRoots.size > 0 && allCollapsedIndices.has(tenatative)) {
        // Look for the previous collapsed root comment
        return allCommentsIdx
                .slice(0, currentIndex)
                .reverse()
                .find((idx) => collapsedIndicesRoots.has(idx))
    }
    return tenatative
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
    allComments[newIndex].style.backgroundColor = '#e0edfc'
    if (oldIndex !== newIndex) {
        allComments[oldIndex].style.backgroundColor = ''
    }
}


function getAllElementsFlattened() {
    const posts = document.querySelectorAll('.entry')
    if (posts.length === 0) {
        return allCommentsFlattened()
    } else {
        const indices = [...Array(posts.length).keys()]
        const depths = Array(posts.length).fill(0)
        return [Array.from(posts), indices, indices, depths]
    }
}

function allCommentsFlattened() {
    let comments = []
    let parentIndices = []
    let depths = []
    const parentComments = document.querySelectorAll('.comments')[0].children
    for (const comment of <any>parentComments) {
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
    parentComment: any, currentDepth: number
): [any[], number[]] {
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
    let comment = allComments[currentIndex].children[0]
    const currentDepth = depths[currentIndex]
    if (comment.open) {
        collapse(currentDepth)
    } else {
        uncollapse(currentDepth)
    }
    comment.open = !comment.open
}

function collapse(currentDepth: number) {
    collapsedIndicesRoots.add(currentIndex)
    // Also push in every next comment with a greater depth,
    // until meeting a comment with equal depth
    allCollapsedIndices.add(currentIndex)
    for (const [idx, depth] of depths.slice(currentIndex + 1).entries()) {
        if (depth > currentDepth) {
            allCollapsedIndices.add(idx + currentIndex + 1)
        } else {
            break
        }
    }
}

function uncollapse(currentDepth: number) {
    collapsedIndicesRoots.delete(currentIndex)
    allCollapsedIndices.delete(currentIndex)
    for (const collapsedIdx of allCollapsedIndices) {
        if (depths[collapsedIdx] > currentDepth) {
            allCollapsedIndices.delete(collapsedIdx)
        } else if (depths[collapsedIdx] === currentDepth) {
            break
        }
    }
}

function togglePreview() {
    if (!initTriggered) {
        initTriggered = true
        scrollToIndex(0, 0)
    }
    const element = document.querySelectorAll('.entry')[currentIndex]
    const meta = searchByClass(element.children, 'meta')
    const links = searchByClass(meta.children, 'links')
    let container = searchByTag(links.children, 'details')
    container.open = !container.open
    // In case if the preview is at the bottom of the page
    document.querySelectorAll('.entry')[currentIndex].scrollIntoView()
    previewEnabled = !previewEnabled
}

function openComments() {
    const element = document.querySelectorAll('.entry')[currentIndex]
    const meta = searchByClass(element.children, 'meta')
    let comments
    if (meta) {
        const links = searchByClass(meta.children, 'links')
        comments = searchByClass(links.children, 'comments')
    } else {
        const title = searchByClass(element.children, 'title')
        const meta = searchByClass(title.children, 'meta')
        comments = searchByClass(meta.children, 'comments')
    }
    browser.runtime.sendMessage({"url": comments.href})
}

function searchByClass(elements: HTMLCollection, name: string) {
    for (const element of <any>elements) {
        if (element.className === name) {
            return element
        }
    }
}

function searchByTag(elements: HTMLCollection, name: string) {
    for (const element of <any>elements) {
        if (element.localName === name) {
            return element
        }
    }
}
