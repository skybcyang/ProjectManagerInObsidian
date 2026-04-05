import { App } from 'obsidian';

/**
 * 获取用户头像元素
 * 通过 UserProfile 插件 API 创建头像 DOM
 */
export function getUserAvatarElement(app: App, userId: string, size: number = 16): HTMLElement | null {
  // @ts-ignore
  const userProfile = app.plugins.getPlugin('user-profile');
  if (!userProfile?.api) return null;

  const me = userProfile.api.getMe?.();
  if (me?.id === userId) {
    return userProfile.api.createMyAvatarElement?.(size) || null;
  }

  const dummyUser = { id: userId, name: userId, createdAt: '', updatedAt: '' };
  return userProfile.api.createAvatarElement?.(dummyUser, size) || null;
}
