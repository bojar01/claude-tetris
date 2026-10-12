import type { ClientModule, ClientSurface } from 'claude-code'

type Props = { isWorking: boolean; best: number }
type Kind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
type Piece = { kind: Kind; cells: number[][]; x: number; y: number }
type Game = {
  board: (Kind | null)[][]
  piece: Piece
  next: Kind
  score: number
  lines: number
  level: number
  isOver: boolean
  isPaused: boolean
}

const W = 10
const H = 20
const KINDS: Kind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
const SHAPES: Record<Kind, number[][]> = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
}
const COLORS: Record<Kind, string> = {
  I: 'cyan',
  O: 'yellow',
  T: 'magenta',
  S: 'green',
  Z: 'red',
  J: 'blue',
  L: '#ff8800',
}
const POINTS = [0, 100, 300, 500, 800]

const randomKind = (): Kind => KINDS[Math.floor(Math.random() * KINDS.length)]!

const spawn = (kind: Kind): Piece => {
  const cells = SHAPES[kind]
  return { kind, cells, x: Math.floor((W - cells.length) / 2), y: kind === 'I' ? -1 : 0 }
}

const rotate = (cells: number[][]): number[][] =>
  cells.map((row, y) => row.map((_, x) => cells[cells.length - 1 - x]![y]!))

const fits = (board: Game['board'], p: Piece): boolean =>
  p.cells.every((row, dy) =>
    row.every((on, dx) => {
      if (!on) return true
      const x = p.x + dx
      const y = p.y + dy
      return x >= 0 && x < W && y < H && (y < 0 || board[y]![x] === null)
    }),
  )

const newGame = (): Game => ({
  board: Array.from({ length: H }, () => Array<Kind | null>(W).fill(null)),
  piece: spawn(randomKind()),
  next: randomKind(),
  score: 0,
  lines: 0,
  level: 1,
  isOver: false,
  isPaused: false,
})

// Locks the piece, clears full rows, spawns the next one.
const lock = (g: Game, bonus = 0): Game => {
  const board = g.board.map(row => [...row])
  g.piece.cells.forEach((row, dy) =>
    row.forEach((on, dx) => {
      const y = g.piece.y + dy
      if (on && y >= 0) board[y]![g.piece.x + dx] = g.piece.kind
    }),
  )
  const kept = board.filter(row => row.some(c => c === null))
  const cleared = H - kept.length
  const rows = [...Array.from({ length: cleared }, () => Array<Kind | null>(W).fill(null)), ...kept]
  const lines = g.lines + cleared
  const piece = spawn(g.next)

  return {
    ...g,
    board: rows,
    piece,
    next: randomKind(),
    score: g.score + POINTS[cleared]! * g.level + bonus,
    lines,
    level: 1 + Math.floor(lines / 10),
    isOver: !fits(rows, piece),
  }
}

const move = (g: Game, dx: number, dy: number): Game => {
  const piece = { ...g.piece, x: g.piece.x + dx, y: g.piece.y + dy }
  if (fits(g.board, piece)) return { ...g, piece }
  return dy > 0 ? lock(g) : g
}

const turn = (g: Game): Game => {
  const cells = rotate(g.piece.cells)
  for (const kick of [0, -1, 1, -2, 2]) {
    const piece = { ...g.piece, cells, x: g.piece.x + kick }
    if (fits(g.board, piece)) return { ...g, piece }
  }
  return g
}

const ghostY = (g: Game): number => {
  let y = g.piece.y
  while (fits(g.board, { ...g.piece, y: y + 1 })) y++
  return y
}

const hardDrop = (g: Game): Game => {
  const y = ghostY(g)
  return lock({ ...g, piece: { ...g.piece, y } }, (y - g.piece.y) * 2)
}

const gravityMs = (level: number) => Math.max(80, 800 - (level - 1) * 70)

const isFrozen = (g: Game, props: Props) => g.isOver || g.isPaused || !props.isWorking

const apply = (surface: ClientSurface<Game>, props: Props, fn: (g: Game) => Game) => {
  const g = surface.state
  if (!g) return
  const after = fn(g)
  if (after === g) return
  if (after.isOver && !g.isOver && after.score > props.best) {
    surface.post({ best: after.score })
  }
  surface.setState(after)
}

// Depending on the terminal, the space bar arrives as ' ', 'space' or 'Space'.
const isSpace = (key: string) => key.toLowerCase() === 'space' || (key.length > 0 && key.trim() === '')

const handleKey = (surface: ClientSurface<Game>, props: Props, key: string) => {
  const play = (g: Game): Game => {
    if (key === 'r') return newGame()
    if (key === 'p') return { ...g, isPaused: !g.isPaused }
    if (isFrozen(g, props)) return g
    if (key === 'left' || key === 'h') return move(g, -1, 0)
    if (key === 'right' || key === 'l') return move(g, 1, 0)
    if (key === 'down' || key === 'j') return { ...move(g, 0, 1), score: g.score + 1 }
    if (key === 'up' || key === 'k' || key === 'x') return turn(g)
    if (isSpace(key) || key === 'return' || key === 'enter') return hardDrop(g)
    return g
  }
  apply(surface, props, play)
}

const start = (surface: ClientSurface<Game>, props: Props) => {
  let current = props
  let acc = 0
  const set = (fn: (g: Game) => Game) => apply(surface, current, fn)

  surface.every(50, () => {
    const g = surface.state
    if (!g || isFrozen(g, current)) return
    acc += 50
    if (acc >= gravityMs(g.level)) {
      acc = 0
      set(x => move(x, 0, 1))
    }
  })

  surface.setState(newGame())

  return (next: Props) => {
    current = next
  }
}

const listeners = new WeakMap<object, (p: Props) => void>()

const Tetris: ClientModule<Props, Game> = (props, surface) => {
  const { Box, Text } = surface.elements
  const g = surface.state

  if (!g) {
    surface.onKey(({ key }) => handleKey(surface, props, key))
    listeners.set(surface, start(surface, props))
    return <Text dimColor>Loading…</Text>
  }
  listeners.get(surface)?.(props)
  // Re-registered on every draw: after a mod reload, the open game picks up the new code.
  surface.onKey(({ key }) => handleKey(surface, props, key))

  const ghost = ghostY(g)
  const cellAt = (x: number, y: number): { kind: Kind | null; isGhost: boolean } => {
    const dx = x - g.piece.x
    const row = g.piece.cells[y - g.piece.y]
    if (row?.[dx]) return { kind: g.piece.kind, isGhost: false }
    const ghostRow = g.piece.cells[y - ghost]
    if (ghostRow?.[dx] && !g.board[y]![x]) return { kind: g.piece.kind, isGhost: true }
    return { kind: g.board[y]![x] ?? null, isGhost: false }
  }

  const nextShape = SHAPES[g.next].filter(row => row.some(Boolean))
  const status = g.isOver
    ? 'GAME OVER — r to restart'
    : !props.isWorking
      ? 'Claude is done ✔ paused'
      : g.isPaused
        ? 'PAUSED — p to resume'
        : 'Claude is coding… play!'

  return (
    <Box flexDirection="row">
      <Box flexDirection="column" borderStyle="round" borderColor="claude">
        {g.board.map((_, y) => (
          <Text key={String(y)}>
            {Array.from({ length: W }, (_, x) => {
              const { kind, isGhost } = cellAt(x, y)
              if (!kind) return <Text dimColor>{' ·'}</Text>
              return isGhost ? <Text color={COLORS[kind]}>{'░░'}</Text> : <Text color={COLORS[kind]}>{'██'}</Text>
            })}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        <Text bold color="claude">TETRIS</Text>
        <Text> </Text>
        <Text>Score  {g.score}</Text>
        <Text>Lines  {g.lines}</Text>
        <Text>Level  {g.level}</Text>
        <Text dimColor>Best   {Math.max(props.best, g.score)}</Text>
        <Text> </Text>
        <Text>Next</Text>
        {nextShape.map(row => (
          <Text color={COLORS[g.next]}>{row.map(on => (on ? '██' : '  ')).join('')}</Text>
        ))}
        <Text> </Text>
        <Text color={g.isOver ? 'error' : props.isWorking ? 'success' : 'warning'}>{status}</Text>
        <Text> </Text>
        <Text dimColor>← → move   ↑ rotate</Text>
        <Text dimColor>↓ soft drop  space/Enter hard drop</Text>
        <Text dimColor>p pause  r restart</Text>
        <Text dimColor>click to play, Esc to leave</Text>
      </Box>
    </Box>
  )
}

export default Tetris
