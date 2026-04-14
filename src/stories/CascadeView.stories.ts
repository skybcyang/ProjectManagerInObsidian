import type { Meta, StoryObj } from '@storybook/html';
import { createMockFeature, createMockProject, createMockVersion } from '../../tests/setup';

interface CascadeViewProps {
  versions: Array<{
    version: any;
    projects: Array<{
      project: any;
      features: any[];
    }>;
  }>;
}

const createCascadeView = ({ versions }: CascadeViewProps): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'pm-view pm-cascade-container';
  container.style.cssText = 'padding: 20px; background: #1e1e1e; min-height: 100vh;';

  versions.forEach(({ version, projects }) => {
    // Version section
    const versionSection = document.createElement('div');
    versionSection.className = 'pm-cascade-section';
    versionSection.style.cssText = `
      margin-bottom: 24px;
      background: var(--background-primary);
      border-radius: 8px;
      border: 1px solid var(--background-modifier-border);
      overflow: hidden;
    `;

    // Version header
    const versionHeader = document.createElement('div');
    versionHeader.className = 'pm-cascade__header';
    versionHeader.style.cssText = `
      background: var(--background-secondary);
      padding: 16px 20px;
      cursor: pointer;
    `;

    const titleRow = document.createElement('div');
    titleRow.className = 'pm-cascade__title-row';
    titleRow.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 8px;';

    const title = document.createElement('div');
    title.className = 'pm-cascade__title';
    title.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600;';

    const icon = document.createElement('span');
    icon.textContent = '📁';
    title.appendChild(icon);

    const name = document.createElement('span');
    name.textContent = version.name;
    title.appendChild(name);

    titleRow.appendChild(title);

    if (version.status) {
      const status = document.createElement('span');
      status.className = `pm-cascade__status pm-cascade__status--${version.status}`;
      status.textContent = version.status;
      status.style.cssText = `
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 11px;
        background: ${version.status === 'completed' ? '#22c55e20' :
                     version.status === 'in-progress' ? '#3b82f620' : '#f59e0b20'};
        color: ${version.status === 'completed' ? '#22c55e' :
                version.status === 'in-progress' ? '#3b82f6' : '#f59e0b'};
      `;
      titleRow.appendChild(status);
    }

    versionHeader.appendChild(titleRow);

    // Summary
    const summary = document.createElement('div');
    summary.className = 'pm-cascade__summary';
    summary.style.cssText = 'display: flex; align-items: center; gap: 16px; font-size: 12px; color: var(--text-muted);';

    const totalFeatures = projects.reduce((sum, p) => sum + p.features.length, 0);
    const completedFeatures = projects.reduce((sum, p) =>
      sum + p.features.filter((f: any) => f.status === 'completed').length, 0
    );

    summary.innerHTML = `
      <span>${projects.length} 项目 · ${totalFeatures} 特性 · ${completedFeatures} 已完成</span>
      ${version.endDate ? `<span>📅 ${version.endDate}</span>` : ''}
    `;

    versionHeader.appendChild(summary);
    versionSection.appendChild(versionHeader);

    // Projects container
    const projectsContainer = document.createElement('div');
    projectsContainer.className = 'pm-cascade__projects';
    projectsContainer.style.cssText = 'padding: 16px 20px;';

    projects.forEach(({ project, features }) => {
      const projectCard = document.createElement('div');
      projectCard.className = 'pm-cascade__project';
      projectCard.style.cssText = `
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border-hover);
        border-radius: 8px;
        margin-bottom: 12px;
        overflow: hidden;
      `;

      // Project header
      const projectHeader = document.createElement('div');
      projectHeader.className = 'pm-cascade__project-header';
      projectHeader.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: var(--background-secondary);
        cursor: pointer;
        border-bottom: 1px solid var(--background-modifier-border-hover);
      `;

      const projectIcon = document.createElement('span');
      projectIcon.textContent = '📂';
      projectHeader.appendChild(projectIcon);

      const projectName = document.createElement('span');
      projectName.className = 'pm-cascade__project-name';
      projectName.textContent = project.name;
      projectName.style.cssText = 'font-weight: 500; flex: 1;';
      projectHeader.appendChild(projectName);

      // Mini progress
      const completed = features.filter((f: any) => f.status === 'completed').length;
      const avgProgress = features.length > 0 ? Math.round(features.reduce((sum, f) => sum + (f.progress || 0), 0) / features.length) : 0;

      if (features.length > 0) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'pm-cascade__project-progress';
        progressContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';

        const progressBar = document.createElement('div');
        progressBar.className = 'pm-cascade__mini-progress';
        progressBar.style.cssText = 'width: 60px; height: 4px; background: var(--background-modifier-border); border-radius: 2px; overflow: hidden;';
        const fill = document.createElement('div');
        fill.className = 'pm-cascade__mini-progress-fill';
        fill.style.cssText = `width: ${avgProgress}%; height: 100%; background: var(--interactive-accent);`;
        progressBar.appendChild(fill);

        const text = document.createElement('span');
        text.className = 'pm-cascade__progress-text';
        text.textContent = `${avgProgress}%`;
        text.style.cssText = 'font-size: 11px; color: var(--text-muted);';

        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(text);
        projectHeader.appendChild(progressContainer);
      }

      projectCard.appendChild(projectHeader);

      // Project stats
      if (features.length > 0) {
        const stats = document.createElement('div');
        stats.className = 'pm-cascade__project-stats';
        stats.textContent = `${features.length} 特性 · ${completed} 已完成`;
        stats.style.cssText = 'padding: 8px 16px; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid var(--background-modifier-border-hover);';
        projectCard.appendChild(stats);
      }

      // Features list
      if (features.length > 0) {
        const featuresContainer = document.createElement('div');
        featuresContainer.className = 'pm-cascade__features';
        featuresContainer.style.cssText = 'padding: 8px;';

        features.forEach((feature: any) => {
          const row = document.createElement('div');
          row.className = 'pm-cascade__feature';
          row.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.15s ease;
          `;

          // Priority dot
          if (feature.priority) {
            const priority = document.createElement('span');
            priority.className = 'pm-cascade__feature-priority';
            priority.textContent = '●';
            priority.style.cssText = `color: ${feature.priority === 'critical' ? '#ef4444' :
                                              feature.priority === 'high' ? '#f97316' :
                                              feature.priority === 'medium' ? '#eab308' : '#22c55e'};`;
            row.appendChild(priority);
          }

          // Icon
          const featIcon = document.createElement('span');
          featIcon.className = 'pm-cascade__feature-icon';
          featIcon.textContent = '☰';
          featIcon.style.cssText = 'color: var(--text-muted);';
          row.appendChild(featIcon);

          // Name
          const nameContainer = document.createElement('div');
          nameContainer.className = 'pm-cascade__feature-name-container';
          nameContainer.style.cssText = 'flex: 1;';

          const name = document.createElement('span');
          name.className = 'pm-cascade__feature-name';
          name.textContent = feature.name;
          nameContainer.appendChild(name);
          row.appendChild(nameContainer);

          // Progress
          if (feature.progress !== undefined) {
            const progress = document.createElement('span');
            progress.className = 'pm-cascade__feature-progress';
            progress.textContent = `${feature.progress}%`;
            progress.style.cssText = 'font-size: 11px; color: var(--text-muted);';
            row.appendChild(progress);
          }

          // Due date
          if (feature.endDate) {
            const due = document.createElement('span');
            due.className = 'pm-cascade__feature-due';
            due.textContent = feature.endDate;
            due.style.cssText = 'font-size: 11px; color: var(--text-muted);';
            row.appendChild(due);
          }

          // Owner
          if (feature.owner) {
            const owner = document.createElement('span');
            owner.className = 'pm-cascade__feature-owner';
            owner.textContent = `@${feature.owner}`;
            owner.style.cssText = 'font-size: 11px; color: var(--text-accent);';
            row.appendChild(owner);
          }

          row.addEventListener('mouseenter', () => {
            row.style.background = 'var(--background-modifier-hover)';
          });
          row.addEventListener('mouseleave', () => {
            row.style.background = '';
          });

          featuresContainer.appendChild(row);
        });

        projectCard.appendChild(featuresContainer);
      }

      projectsContainer.appendChild(projectCard);
    });

    versionSection.appendChild(projectsContainer);
    container.appendChild(versionSection);
  });

  return container;
};

const meta: Meta<CascadeViewProps> = {
  title: 'Views/CascadeView',
  tags: ['autodocs'],
  render: (args) => createCascadeView(args),
};

export default meta;

type Story = StoryObj<CascadeViewProps>;

export const Default: Story = {
  args: {
    versions: [
      {
        version: createMockVersion({ name: 'v2.0 大版本', status: 'in-progress', endDate: '2024-06-01' }),
        projects: [
          {
            project: createMockProject({ name: '用户系统重构', status: 'in-progress' }),
            features: [
              createMockFeature({ name: '登录优化', status: 'completed', priority: 'high', progress: 100, owner: '张三', endDate: '04-15' }),
              createMockFeature({ name: '权限管理', status: 'in-progress', priority: 'critical', progress: 75, owner: '李四', endDate: '04-25' }),
              createMockFeature({ name: '用户画像', status: 'todo', priority: 'medium', progress: 0, owner: '王五', endDate: '05-10' }),
            ],
          },
          {
            project: createMockProject({ name: '支付模块', status: 'backlog' }),
            features: [
              createMockFeature({ name: '支付宝集成', status: 'in-progress', priority: 'critical', progress: 60, owner: '赵六', endDate: '04-30' }),
              createMockFeature({ name: '微信支付', status: 'todo', priority: 'critical', progress: 0, owner: '钱七', endDate: '05-05' }),
            ],
          },
        ],
      },
      {
        version: createMockVersion({ name: 'v1.5 补丁', status: 'completed', endDate: '2024-03-15' }),
        projects: [
          {
            project: createMockProject({ name: 'Bug修复', status: 'completed' }),
            features: [
              createMockFeature({ name: '修复内存泄漏', status: 'completed', priority: 'high', progress: 100, owner: '孙八' }),
              createMockFeature({ name: '性能优化', status: 'completed', priority: 'medium', progress: 100, owner: '周九' }),
            ],
          },
        ],
      },
    ],
  },
};

export const SingleVersion: Story = {
  args: {
    versions: [
      {
        version: createMockVersion({ name: 'v3.0 规划', status: 'planning', endDate: '2024-12-31' }),
        projects: [
          {
            project: createMockProject({ name: 'AI 功能', status: 'backlog' }),
            features: [
              createMockFeature({ name: '智能推荐', status: 'backlog', priority: 'high', progress: 0, owner: 'AI组' }),
              createMockFeature({ name: '自然语言处理', status: 'backlog', priority: 'medium', progress: 0, owner: 'AI组' }),
            ],
          },
        ],
      },
    ],
  },
};

export const ManyFeatures: Story = {
  args: {
    versions: [
      {
        version: createMockVersion({ name: 'v2.0', status: 'in-progress' }),
        projects: [
          {
            project: createMockProject({ name: '大项目' }),
            features: Array.from({ length: 8 }, (_, i) =>
              createMockFeature({
                name: `特性 ${i + 1}`,
                status: i < 3 ? 'completed' : i < 6 ? 'in-progress' : 'todo',
                priority: i < 2 ? 'critical' : i < 5 ? 'high' : 'medium',
                progress: i < 3 ? 100 : i < 6 ? 50 : 0,
                owner: `开发${i + 1}`,
              })
            ),
          },
        ],
      },
    ],
  },
};
