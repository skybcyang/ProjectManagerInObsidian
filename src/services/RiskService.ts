import { App, TFile } from 'obsidian';
import type { EntityManager } from '../core';
import { RiskParser } from './RiskParser';
import type { RiskItem } from '../types';

export class RiskService {
  private riskParser = new RiskParser();

  constructor(
    private app: App,
    private entityManager: EntityManager
  ) {}

  /**
   * 获取单个文件的风险列表
   */
  async getRisksByPath(path: string): Promise<RiskItem[]> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile) || file.extension !== 'md') return [];

    const content = await this.app.vault.cachedRead(file);
    return this.riskParser.parseRisks(content);
  }

  /**
   * 获取所有风险（跨所有实体）
   */
  async getAllRisks(): Promise<RiskItem[]> {
    const versions = await this.entityManager.listVersions();
    const projects = await this.entityManager.listProjects();
    const features = await this.entityManager.listFeatures();

    const allRisks: RiskItem[] = [];

    for (const v of versions) {
      const path = await this.entityManager.getVersionPath(v.id);
      if (path) {
        const risks = await this.getRisksByPath(path);
        risks.forEach(r => { r.sourceName = v.name; r.sourceType = 'version'; r.sourcePath = path; });
        allRisks.push(...risks);
      }
    }

    for (const p of projects) {
      const path = await this.entityManager.getProjectPath(p.id);
      if (path) {
        const risks = await this.getRisksByPath(path);
        risks.forEach(r => { r.sourceName = p.name; r.sourceType = 'project'; r.sourcePath = path; });
        allRisks.push(...risks);
      }
    }

    for (const f of features) {
      const path = await this.entityManager.getFeaturePath(f.id);
      if (path) {
        const risks = await this.getRisksByPath(path);
        risks.forEach(r => { r.sourceName = f.name; r.sourceType = 'feature'; r.sourcePath = path; });
        allRisks.push(...risks);
      }
    }

    return allRisks;
  }

  /**
   * 获取某个版本及其下属项目、特性的所有风险
   */
  async getRisksByVersion(versionId: string): Promise<RiskItem[]> {
    const version = await this.entityManager.getVersion(versionId);
    if (!version) return [];

    const risks: RiskItem[] = [];

    // 版本自身风险
    const vPath = await this.entityManager.getVersionPath(versionId);
    if (vPath) {
      const vRisks = await this.getRisksByPath(vPath);
      vRisks.forEach(r => { r.sourceName = version.name; r.sourceType = 'version'; r.sourcePath = vPath; });
      risks.push(...vRisks);
    }

    // 下属项目
    const projects = await this.entityManager.getVersionProjects(versionId);
    for (const p of projects) {
      const pPath = await this.entityManager.getProjectPath(p.id);
      if (pPath) {
        const pRisks = await this.getRisksByPath(pPath);
        pRisks.forEach(r => { r.sourceName = p.name; r.sourceType = 'project'; r.sourcePath = pPath; });
        risks.push(...pRisks);
      }
    }

    // 下属特性（包括无项目归属的）
    const features = await this.entityManager.listFeatures({ versionId });
    for (const f of features) {
      const fPath = await this.entityManager.getFeaturePath(f.id);
      if (fPath) {
        const fRisks = await this.getRisksByPath(fPath);
        fRisks.forEach(r => { r.sourceName = f.name; r.sourceType = 'feature'; r.sourcePath = fPath; });
        risks.push(...fRisks);
      }
    }

    return risks;
  }

  /**
   * 获取某个项目及其下属特性的所有风险
   */
  async getRisksByProject(projectId: string): Promise<RiskItem[]> {
    const project = await this.entityManager.getProject(projectId);
    if (!project) return [];

    const risks: RiskItem[] = [];

    // 项目自身风险
    const pPath = await this.entityManager.getProjectPath(projectId);
    if (pPath) {
      const pRisks = await this.getRisksByPath(pPath);
      pRisks.forEach(r => { r.sourceName = project.name; r.sourceType = 'project'; });
      risks.push(...pRisks);
    }

    // 下属特性
    const features = await this.entityManager.getProjectFeatures(projectId);
    for (const f of features) {
      const fPath = await this.entityManager.getFeaturePath(f.id);
      if (fPath) {
        const fRisks = await this.getRisksByPath(fPath);
        fRisks.forEach(r => { r.sourceName = f.name; r.sourceType = 'feature'; r.sourcePath = fPath; });
        risks.push(...fRisks);
      }
    }

    return risks;
  }
}
