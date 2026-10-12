import { expect, test } from 'claude-code/testing'

const PANE = {
  component: 'Pane',
  requestId: 'tetris',
  props: { title: 'Tetris', isFocused: true, bodyColumns: 60 } as never,
} as const

test('the game starts as soon as Claude starts working, and pauses otherwise', async ($, on) => {
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const idle = await $.ui.mount({ plugin: 'tetris', surface, ...PANE })
    await idle.advance(100)
    expect(await idle.find({ type: 'Text', text: /TETRIS/, in: 'game' })).toBeDefined()
    expect(await idle.find({ type: 'Text', text: /Claude is done/, in: 'game' })).toBeDefined()
    await idle.unmount()
  }

  await $.turn.start({ text: 'think', turnId: 't1' })

  const ui = await $.ui.mount({ plugin: 'tetris', surface: 'terminal', ...PANE })
  await ui.advance(3100)
  expect(await ui.find({ type: 'Text', text: /play!/, in: 'game' })).toBeDefined()
  await ui.key({ key: ' ', in: 'game' })
  await ui.advance(100)
  expect(await ui.find({ type: 'Text', text: /Score  [1-9]/, in: 'game' })).toBeDefined()

  // Depending on the terminal, the space bar has several names; Enter also hard-drops the piece.
  for (const key of [' ', 'space', 'Space', 'return']) {
    await ui.key({ key: 'r', in: 'game' })
    expect(await ui.find({ type: 'Text', text: /Score  0/, in: 'game' })).toBeDefined()
    await ui.advance(3100)
    await ui.key({ key, in: 'game' })
    await ui.advance(100)
    expect(await ui.find({ type: 'Text', text: /Score  [1-9]/, in: 'game' })).toBeDefined()
  }
  await ui.unmount()
})

test('play resumes after a 3, 2, 1 countdown', async ($, on) => {
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)

  await $.turn.start({ text: 'think', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'tetris', surface: 'terminal', ...PANE })
  const score = async (pattern: RegExp) =>
    expect(await ui.find({ type: 'Text', text: pattern, in: 'game' })).toBeDefined()

  // A new game counts down, and the keys do nothing until it is over.
  await ui.advance(100)
  await score(/Get ready… 3/)
  await ui.key({ key: 'space', in: 'game' })
  await score(/Score  0/)
  await ui.advance(1000)
  await score(/Get ready… 2/)
  await ui.advance(1000)
  await score(/Get ready… 1/)
  await ui.advance(1000)
  await score(/play!/)
  await ui.key({ key: 'space', in: 'game' })
  await score(/Score  [1-9]/)

  // Leaving the pause counts down again.
  await ui.key({ key: 'r', in: 'game' })
  await ui.advance(3100)
  await ui.key({ key: 'p', in: 'game' })
  await score(/PAUSED/)
  await ui.advance(5000)
  await ui.key({ key: 'p', in: 'game' })
  await ui.advance(100)
  await score(/Get ready… 3/)
  await ui.key({ key: 'space', in: 'game' })
  await score(/Score  0/)

  // So does Claude getting back to work.
  await ui.advance(3100)
  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 0, isAborted: false })
  await ui.advance(100)
  await score(/Claude is done/)
  await $.turn.start({ text: 'again', turnId: 't2' })
  await ui.advance(100)
  await score(/Get ready… 3/)
  await ui.key({ key: 'space', in: 'game' })
  await score(/Score  0/)
  await ui.advance(3100)
  await ui.key({ key: 'space', in: 'game' })
  await score(/Score  [1-9]/)
  await ui.unmount()
})
