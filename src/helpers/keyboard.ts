const IME_PROCESS_KEY_CODE = 229

type ComposableKeyboardEvent = {
  keyCode: number
  nativeEvent: Pick<KeyboardEvent, 'isComposing'>
}

export const matchIsImeComposing = (event: ComposableKeyboardEvent) => {
  return event.nativeEvent.isComposing || event.keyCode === IME_PROCESS_KEY_CODE
}
