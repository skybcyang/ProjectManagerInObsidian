import { App } from 'obsidian';

/**
 * 获取用户头像元素
 * 通过 UserProfile 插件 API 创建头像 DOM
 */
export function getUserAvatarElement(app: App, userId: string, size: number = 16): HTMLElement | null {
  // @ts-ignore
  const workspace = app.plugins.getPlugin('team-workspace');
  if (!workspace?.api) return null;

  const me = workspace.api.getMe?.();
  if (me?.id === userId) {
    return workspace.api.createMyAvatarElement?.(size) || null;
  }

  const dummyUser = { id: userId, name: userId, createdAt: '', updatedAt: '' };
  return workspace.api.createAvatarElement?.(dummyUser, size) || null;
}
