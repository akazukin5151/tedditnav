var initTriggered: boolean = false
var currentIndex: number = 0
var collapsedIndicesRoots: Set<number> = new Set()
var allCollapsedIndices: Set<number> = new Set()
var [allComments, allCommentsIdx, parentComments, depths] = getAllElementsFlattened()

function handleCommentClick(event: any) {
    let clickedComment = event.target
    while (!clickedComment.className.includes('comment')) {
        clickedComment = clickedComment.parentElement
    }
    for (const [idx, comment] of allComments.entries()) {
        if (comment.id === clickedComment.id && currentIndex != idx) {
            selectIndex(currentIndex, idx)
            currentIndex = idx
            break
        }
    }
}

var elements: any = document.getElementsByClassName('comment')
for (let el of elements) {
    el.addEventListener('click', handleCommentClick, false)
}

document.addEventListener('keypress', function onPress(event) {
    if (event.key === 'c') {
        return openComments()
    } else if (event.key === 'x') {
        return togglePreview()
    } else if (event.key === 'q') {
        return toggleCollapse()
    }

    let newIndex: number = 0  // Will be changed anyway
    if (event.key === 's') {
        newIndex = goDownParent(currentIndex, parentComments)
    } else if (event.key === 'w') {
        newIndex = goUpParent(currentIndex)
    } else if (event.key === 'f') {
        newIndex = goDownChild(currentIndex, allCommentsIdx)
    } else if (event.key === 'r') {
        newIndex = goUpChild(currentIndex)
    } else {
        return
    }
    scrollToIndex(currentIndex, newIndex)
    currentIndex = newIndex
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
    let tenatative = currentIndex - 1
    if (collapsedIndicesRoots.size > 0 && allCollapsedIndices.has(tenatative)) {
        // Look for the previous collapsed root comment
        return allCommentsIdx
                .slice(0, currentIndex)
                .reverse()
                .find((idx) => collapsedIndicesRoots.has(idx))
    }
    return tenatative
}

function goDownParent(currentIndex: number, parentComments: number[]) {
    if (!initTriggered) {
        initTriggered = true
        return currentIndex
    }
    if (currentIndex >= parentComments[-1]) {
        return currentIndex
    }
    if (parentComments.includes(currentIndex)) {
        let res = parentComments[parentComments.indexOf(currentIndex) + 1]
        if (!res) {
            return currentIndex
        } else {
            return res
        }
    }
    // Else: in a child comment, look for next parent comment
    for (const idx of parentComments) {
        if (idx >= currentIndex) {
            return idx
        }
    }
    return currentIndex
}

function goUpParent(currentIndex: number) {
    if (!initTriggered) {
        initTriggered = true
        return currentIndex
    }
    if (currentIndex === 0) {
        return currentIndex
    }
    if (parentComments.includes(currentIndex)) {
        return parentComments[parentComments.indexOf(currentIndex) - 1]
    }
    // Else: in a child comment, look for previous parent comment
    for (const idx of parentComments.slice().reverse()) {
        if (idx < currentIndex) {
            return idx
        }
    }
    return currentIndex
}

function scrollToIndex(oldIndex: number, newIndex: number) {
    allComments[newIndex].scrollIntoView()
    selectIndex(oldIndex, newIndex)
}

function selectIndex(oldIndex: number, newIndex: number) {
    allComments[newIndex].style.backgroundColor = '#e0edfc'
    if (oldIndex != newIndex) {
        allComments[oldIndex].style.backgroundColor = ''
    }
}


function getAllElementsFlattened() {
    let posts = document.querySelectorAll('.entry')
    if (posts.length === 0) {
        return allCommentsFlattened()
    } else {
        let indices = [...Array(posts.length).keys()]
        let depths = Array(posts.length).fill(0)
        return [Array.from(posts), indices, indices, depths]
    }
}

function allCommentsFlattened() {
    let comments = []
    let parentIndices = []
    let depths = []
    let parentComments = document.querySelectorAll('.comments')[0].children
    for (const comment of <any>parentComments) {
        comments.push(comment)
        depths.push(0)
        parentIndices.push(comments.length - 1)
        let [rec_comments, rec_depths] = getAllChildComments(comment, 0)
        comments.push(...rec_comments)
        depths.push(...rec_depths)
    }
    let indices = [...Array(comments.length).keys()]
    return [Array.from(comments), indices, parentIndices, depths]
}

function getAllChildComments(
    parentComment: any, currentDepth: number
): [any[], number[]] {
    let thisComment = parentComment.children[0].children
    let comments = []
    let depths = []
    for (const el of thisComment) {
        if (el.className.includes('comment')) {
            comments.push(el)
            depths.push(currentDepth + 1)
            // extend the comments array with child comments
            let [rec_comments, rec_depths] = getAllChildComments(el, currentDepth + 1)
            comments.push(...rec_comments)
            depths.push(...rec_depths)
        }
    }
    return [Array.from(comments), depths]
}



function toggleCollapse() {
    let comment = allComments[currentIndex].children[0]
    let currentDepth = depths[currentIndex]
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
    let element = document.querySelectorAll('.entry')[currentIndex]
    let meta = searchByClass(element.children, 'meta')
    let links = searchByClass(meta.children, 'links')
    let container = searchByTag(links.children, 'details')
    container.open = !container.open
    // In case if the preview is at the bottom of the page
    document.querySelectorAll('.entry')[currentIndex].scrollIntoView()
}

function openComments() {
    let element = document.querySelectorAll('.entry')[currentIndex]
    let meta = searchByClass(element.children, 'meta')
    let links = searchByClass(meta.children, 'links')
    let comments = searchByClass(links.children, 'comments')
    //FIXME: open in background
    window.open(comments.href)
    //this doesn't work
    //browser.tabs.goBack()
}

function searchByClass(elements: any, name: string) {
    for (const element of elements) {
        if (element.className === name) {
            return element
        }
    }
}

function searchByTag(elements: any, name: string) {
    for (const element of elements) {
        if (element.localName === name) {
            return element
        }
    }
}

function findClosest(set: Set<number>, goal: number) {
    return Array.from(set).reduce(
        (prev, curr) => Math.abs(curr - goal) < Math.abs(prev - goal)
            ? curr
            : prev
    )
}
