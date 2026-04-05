import type { App } from 'obsidian';
import type { Version, Project, Feature } from '../../types';

/**
 * 卡片组件接口
 * 所有卡片渲染器需要实现此接口
 */
export interface CardComponent {
  /** 卡片类型 ID */
  readonly id: string;
  
  /** 
   * 渲染卡片
   * @param entity 实体数据
   * @param onClick 点击回调（可选）
   * @returns HTMLElement 卡片 DOM 元素
   */
  render(entity: unknown, onClick?: () => void): HTMLElement;
  
  /**
   * 判断是否匹配该类型
   */
  matches(entity: unknown): boolean;
}

/**
 * 卡片注册表
 * 管理所有卡片组件，提供统一的卡片渲染入口
 */
export class CardRegistry {
  private cards: Map<string, CardComponent> = new Map();

  /**
   * 注册卡片组件
   */
  register(card: CardComponent): void {
    this.cards.set(card.id, card);
  }

  /**
   * 注销卡片组件
   */
  unregister(id: string): void {
    this.cards.delete(id);
  }

  /**
   * 查找能渲染该实体的卡片组件
   */
  findRenderer(entity: unknown): CardComponent | null {
    for (const card of this.cards.values()) {
      if (card.matches(entity)) {
        return card;
      }
    }
    return null;
  }

  /**
   * 获取指定 ID 的卡片组件
   */
  get(id: string): CardComponent | undefined {
    return this.cards.get(id);
  }

  /**
   * 获取所有已注册的卡片类型
   */
  getAllTypes(): string[] {
    return Array.from(this.cards.keys());
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.cards.clear();
  }

  /**
   * 创建默认的卡片注册表（包含内置卡片）
   */
  static createDefault(): CardRegistry {
    const registry = new CardRegistry();
    
    // 延迟加载以避免循环依赖
    const { FeatureCard } = require('./FeatureCard');
    const { ProjectCard } = require('./ProjectCard');
    const { VersionCard } = require('./VersionCard');
    
    registry.register(new FeatureCard());
    registry.register(new ProjectCard());
    registry.register(new VersionCard());
    
    return registry;
  }
}
