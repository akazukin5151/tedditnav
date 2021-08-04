export function collapse(
    currentIndex: number,
    invisibleComments: Map<number, number[]>,
    invisibleCommentsIdx: Set<number>,
    currentDepth: number,
    depths: number[]
) {
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

export function uncollapse(
    invisibleComments: Map<number, number[]>,
    currentIndex: number,
    invisibleCommentsIdx: Set<number>
) {
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
