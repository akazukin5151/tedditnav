import { collapse, uncollapse } from '../collapsing'
import { goUpChild, goDownChild } from '../motion'


test('simple collapse-uncollapse', () => {
    // given (2nd comment selected)
    let depths = [0, 1, 2, 3, 4]
    let currentIndex = 1
    let currentDepth = 1
    let invisibleComments = new Map()
    let invisibleCommentsIdx = new Set<number>()
    // when (that 2nd comment is collapsed)
    collapse(
        currentIndex,
        invisibleComments,
        invisibleCommentsIdx,
        currentDepth,
        depths,
    )
    // then
    expect(invisibleComments).toEqual(new Map([[ 1, [2, 3, 4] ]]))
    expect(invisibleCommentsIdx).toEqual(new Set([2, 3, 4]))

    // when (that 2nd comment is uncollapsed)
    uncollapse(
        invisibleComments,
        currentIndex,
        invisibleCommentsIdx,
    )
    // then
    expect(invisibleComments).toEqual(new Map())
    expect(invisibleCommentsIdx).toEqual(new Set())
})

test('collapse-up-collapse-down-up', () => {
    // given (3rd comment selected)
    let allCommentsIdx = [0, 1, 2, 3, 4, 5]
    let depths = [0, 1, 2, 3, 4, 1]
    let currentIndex = 2
    let currentDepth = 2
    let invisibleComments = new Map()
    let invisibleCommentsIdx = new Set<number>()
    // when (that 3rd comment is collapsed)
    collapse(
        currentIndex,
        invisibleComments,
        invisibleCommentsIdx,
        currentDepth,
        depths,
    )
    // then
    expect(invisibleComments).toEqual(new Map([[ 2, [3, 4] ]]))
    expect(invisibleCommentsIdx).toEqual(new Set([3, 4]))

    // when (go up from 3rd comment)
    let newIdx1 = goUpChild(true, currentIndex, invisibleCommentsIdx, allCommentsIdx)
    // then
    expect(newIdx1).toEqual(1)

    // when (collapse 2nd comment)
    collapse(
        newIdx1,
        invisibleComments,
        invisibleCommentsIdx,
        depths[newIdx1],
        depths,
    )
    // then
    expect(invisibleComments).toEqual(new Map([[ 2, [3, 4] ], [ 1, [2, 3, 4] ]]))
    expect(invisibleCommentsIdx).toEqual(new Set([3, 4, 2]))

    // when (go down from 2nd comment)
    let newIdx2 = goDownChild(true, newIdx1, invisibleCommentsIdx, allCommentsIdx)
    // then
    expect(newIdx2).toEqual(5)

    // when (go up from 6th comment)
    let newIdx3 = goUpChild(true, newIdx2, invisibleCommentsIdx, allCommentsIdx)
    // then (back to 2nd comment)
    expect(newIdx3).toEqual(1)

    // constants should not change
    expect(depths).toEqual([0, 1, 2, 3, 4, 1])
    expect(allCommentsIdx).toEqual([0, 1, 2, 3, 4, 5])
})


test('collapse-down-collapse-down-up', () => {
    // given (2nd comment selected)
    let allCommentsIdx = [0, 1, 2, 3, 4, 5]
    let depths = [0, 1, 2, 1, 2, 1]
    let currentIndex = 1
    let currentDepth = 1
    let invisibleComments = new Map()
    let invisibleCommentsIdx = new Set<number>()
    // when (that 2nd comment is collapsed)
    collapse(
        currentIndex,
        invisibleComments,
        invisibleCommentsIdx,
        currentDepth,
        depths,
    )
    // then
    expect(invisibleComments).toEqual(new Map([[ 1, [2] ]]))
    expect(invisibleCommentsIdx).toEqual(new Set([2]))

    // when (go down from 2nd comment)
    let newIdx1 = goDownChild(true, currentIndex, invisibleCommentsIdx, allCommentsIdx)
    // then
    expect(newIdx1).toEqual(3)

    // when (collapse 4th comment)
    collapse(
        newIdx1,
        invisibleComments,
        invisibleCommentsIdx,
        depths[newIdx1],
        depths,
    )
    // then
    expect(invisibleComments).toEqual(new Map([[ 1, [2] ], [ 3, [4] ]]))
    expect(invisibleCommentsIdx).toEqual(new Set([2, 4]))

    // when (go down from 4th comment)
    let newIdx2 = goDownChild(true, newIdx1, invisibleCommentsIdx, allCommentsIdx)
    // then
    expect(newIdx2).toEqual(5)

    // when (go up from 6th comment)
    let newIdx3 = goUpChild(true, newIdx2, invisibleCommentsIdx, allCommentsIdx)
    // then (back to 2nd comment)
    expect(newIdx3).toEqual(3)

    // constants should not change
    expect(depths).toEqual([0, 1, 2, 1, 2, 1])
    expect(allCommentsIdx).toEqual([0, 1, 2, 3, 4, 5])
})
