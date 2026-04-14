/**
 * 获取当前浮层应该挂载的容器
 * 当处于 Fullscreen API 全屏模式时，返回全屏元素，否则返回 document.body
 * 这确保挂载在 body 上的下拉菜单/选择器在全屏模式下仍然可见
 */
export function getOverlayContainer(): HTMLElement {
  const fullscreenEl = document.fullscreenElement as HTMLElement | null;
  return fullscreenEl || document.body;
}
