import { browser } from "webextension-polyfill-ts"

var initTriggered: boolean = false
var currentIndex: number = 0
var previewEnabled: boolean = false
var collapsedIndicesRoots: Set<number> = new Set()
var allCollapsedIndices: Set<number> = new Set()
const [
    allComments, allCommentsIdx, parentCommentsIdx, depths
] = getAllElementsFlattened()


function abstractHandlePostClick(
    event: any,
    comp: (clicked: any) => any,
    processor: (post: any) => any,
) {
    let clickedPost = event.target
    while (comp(clickedPost)) {
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

function handleCommentClick(event: any) {
    function processor(clickedComment: any) {
        // if classList doesn't contain odd or even depth...
        if (clickedComment.classList.length < 2) {
            // ...then this is a user page not a comment page
            // In a user page, allComments collects elements with class `entry` instead
            while (clickedComment.className !== 'entry') {
                clickedComment = clickedComment.parentElement
            }
        }
        return clickedComment
    }
    return abstractHandlePostClick(
        event,
        (clicked) => !clicked.className.includes('comment'),
        processor
    )
}

function handlePostClick(event: any) {
    return abstractHandlePostClick(
        event,
        (clicked) => clicked.className !== 'link',
        (post) => post.children[2]
    )
}

function handleUserPostClick(event: any) {
    return abstractHandlePostClick(
        event,
        (clicked) => clicked.className !== 'entry t3',
        (x) => x
    )
}

Array.from(document.getElementsByClassName('comment')).forEach(
    el => el.addEventListener('click', handleCommentClick, false)
)

Array.from(document.getElementsByClassName('link')).forEach(
    el => el.addEventListener('click', handlePostClick, false)
)

Array.from(document.getElementsByClassName('entry t3')).forEach(
    el => el.addEventListener('click', handleUserPostClick, false)
)

function inputFocused() {
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
    if (document.URL.includes('/u/')) {
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

function getUserElements() {
    let entries = Array.from(document.querySelectorAll('.entries')[0].children)
    entries = entries.slice(0, entries.length - 2)
    const indices = [...Array(entries.length).keys()]
    const depths = Array(entries.length).fill(0)
    return [entries, indices, indices, depths]
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
    element.scrollIntoView()

    // Resize the image to fit the browser screen
    let image = searchByClass(container.children, 'preview').children[0]
    const height = document.documentElement.clientHeight
    const new_height = height
        - searchByClass(element.children, 'title').clientHeight
        - searchByClass(meta.children, 'submitted').clientHeight
        - searchByClass(container.children, 'summary').clientHeight
    image.style.setProperty('max-height', new_height.toString() + 'px', 'important')

    previewEnabled = !previewEnabled
}

function openComments() {
    let entry
    if (document.URL.includes('/u/')) {
        entry = allComments[currentIndex].children[2]
    } else {
        entry = document.querySelectorAll('.entry')[currentIndex]
    }
    const meta = searchByClass(entry.children, 'meta')
    let comments
    if (meta) {
        const links = searchByClass(meta.children, 'links')
        comments = searchByClass(links.children, 'comments')
    } else {
        const title = searchByClass(entry.children, 'title')
        const meta = searchByClass(title.children, 'meta')
        comments = searchByClass(meta.children, 'comments')
    }
    browser.runtime.sendMessage({"url": comments.href})
}


function changeImageSize(by: number) {
    const element = document.querySelectorAll('.entry')[currentIndex]
    const meta = searchByClass(element.children, 'meta')
    const links = searchByClass(meta.children, 'links')
    const container = searchByTag(links.children, 'details')
    let image = searchByClass(container.children, 'preview').children[0]
    const new_height = image.height + by
    image.style.setProperty('max-height', new_height.toString() + 'px', 'important')
}

function searchByClass(elements: HTMLCollection, name: string) {
    for (const element of <any>elements) {
        if (element.className === name || element.localName === name) {
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
