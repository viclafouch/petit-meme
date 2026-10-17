const EASE_OUT_FIRST_CONTROL_X = 0.4
const EASE_OUT_SECOND_CONTROL_X = 0.2

export const EASE_OUT = [
  EASE_OUT_FIRST_CONTROL_X,
  0,
  EASE_OUT_SECOND_CONTROL_X,
  1
] as const satisfies readonly [number, number, number, number]
