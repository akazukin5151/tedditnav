export function goDownChild(
    initTriggered: boolean,
    currentIndex: number,
    invisibleCommentsIdx: Set<number>,
    allCommentsIdx: number[]
): number {
    if (!initTriggered) {
        initTriggered = true
        return currentIndex
    }
    if (currentIndex === allCommentsIdx[-1]) {
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

export function goUpChild(
    initTriggered: boolean,
    currentIndex: number,
    invisibleCommentsIdx: Set<number>,
    allCommentsIdx: number[]
): number {
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

