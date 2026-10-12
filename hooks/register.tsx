import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const PANE = 'tetris'

const isWorking = atom({ plugin: 'tetris', key: 'isWorking' } as const, false)
const best = atom({ plugin: 'tetris', key: 'best' } as const, 0)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tetris',
      description: 'Open the Tetris game',
    })
    const stored = Number((await $.store.get('best')) ?? 0)
    await update($, best, () => stored)

    return next(e)
  })

  on('command.run', { command: 'tetris' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Tetris', rows: 24, closeOnEscape: true })

    return { text: 'Tetris is open: click in the game to play.' }
  })

  // Claude starts working (thinking included): the game starts or resumes.
  on('turn.start', async ($, e, next) => {
    await update($, isWorking, () => true)
    void $.ui.open({ id: PANE, title: 'Tetris', rows: 24, closeOnEscape: true })

    return next(e)
  })

  // Claude is done: the game pauses.
  on('turn.complete', async ($, e, next) => {
    await update($, isWorking, () => false)

    return next(e)
  })

  on('ui.message', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    const score = Number((e.data as { best?: number } | null)?.best ?? 0)
    if (score > (await read($, best))) {
      await update($, best, () => score)
      await $.store.set('best', score)
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const working = await read($, isWorking)
    const record = await read($, best)

    if (e.surface === 'terminal' || e.surface === 'desktop') {
      const { Client } = $.ui.resolve(e)

      return (
        <Client
          key="game"
          module="./tetris.tsx"
          props={{ isWorking: working, best: record }}
        />
      )
    }

    const { Text } = $.ui.resolve(e)

    return <Text dimColor>Tetris is played in the terminal.</Text>
  })
}
