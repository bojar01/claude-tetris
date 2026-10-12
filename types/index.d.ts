export type TetrisRecord = number

declare module 'claude-code' {
  interface PluginState {
    tetris: { isWorking: boolean; best: TetrisRecord }
  }
}
