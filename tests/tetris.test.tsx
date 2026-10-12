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
  await ui.advance(100)
  expect(await ui.find({ type: 'Text', text: /play!/, in: 'game' })).toBeDefined()
  await ui.key({ key: ' ', in: 'game' })
  await ui.advance(100)
  expect(await ui.find({ type: 'Text', text: /Score  [1-9]/, in: 'game' })).toBeDefined()

  // Depending on the terminal, the space bar has several names; Enter also hard-drops the piece.
  for (const key of [' ', 'space', 'Space', 'return']) {
    await ui.key({ key: 'r', in: 'game' })
    expect(await ui.find({ type: 'Text', text: /Score  0/, in: 'game' })).toBeDefined()
    await ui.key({ key, in: 'game' })
    await ui.advance(100)
    expect(await ui.find({ type: 'Text', text: /Score  [1-9]/, in: 'game' })).toBeDefined()
  }
  await ui.unmount()
})
