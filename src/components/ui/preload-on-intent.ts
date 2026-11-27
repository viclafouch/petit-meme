export const preloadOnIntent = (load: () => Promise<unknown>) => {
  const preload = () => {
    void load()
  }

  return { onPointerEnter: preload, onPointerDown: preload, onFocus: preload }
}
