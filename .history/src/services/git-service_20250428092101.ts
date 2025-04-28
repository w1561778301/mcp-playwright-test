import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface GitCredentials {
  username?: string;
  password?: string;
  sshKey?: string;
}

export interface GitRepositoryOptions {
  username?: string;
  password?: string;
  branch?: string;
  depth?: number;
}

export class GitService {
  private git: SimpleGit;
  private projectPath: string | null = null;
  private workDir: string;

  constructor(workDir?: string) {
    // 如果没有指定工作目录，使用系统临时目录
    this.workDir = workDir || path.join(os.tmpdir(), 'playwright-mcp-test');

    // 确保工作目录存在
    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true });
    }

    this.git = simpleGit();
  }

  /**
   * 克隆Git仓库
   * @param repositoryUrl 仓库URL
   * @param options 仓库选项
   * @returns 项目路径
   */
  async cloneRepository(repositoryUrl: string, options: GitRepositoryOptions = {}): Promise<{ projectPath: string }> {
    try {
      // 从URL中获取仓库名称
      const repoName = this.getRepositoryNameFromUrl(repositoryUrl);

      // 创建项目目录
      const projectPath = path.join(this.workDir, repoName);

      // 如果目录已存在，先删除
      if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true });
      }

      const cloneOptions: Record<string, any> = {};

      // 设置克隆深度
      if (options.depth) {
        cloneOptions.depth = options.depth;
      }

      // 设置分支
      if (options.branch) {
        cloneOptions.branch = options.branch;
      }

      // 设置认证
      if (options.username && options.password) {
        // 构建带认证的URL
        const urlObj = new URL(repositoryUrl);
        urlObj.username = options.username;
        urlObj.password = options.password;
        repositoryUrl = urlObj.toString();
      }

      // 克隆仓库
      await simpleGit().clone(repositoryUrl, projectPath, cloneOptions);

      // 初始化Git实例
      this.git = simpleGit(projectPath);

      // 设置当前项目路径
      this.projectPath = projectPath;

      return { projectPath };
    } catch (error) {
      console.error('Error cloning repository:', error);
      throw new Error(`Failed to clone repository: ${(error as Error).message}`);
    }
  }

  /**
   * 使用本地项目
   * @param projectPath 本地项目路径
   * @returns 项目路径
   */
  async useLocalProject(projectPath: string): Promise<{ projectPath: string }> {
    try {
      // 确保路径存在
      if (!fs.existsSync(projectPath)) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }

      // 初始化Git实例
      this.git = simpleGit(projectPath);

      // 检查是否是有效的Git仓库
      try {
        await this.git.status();
      } catch (error) {
        console.warn(`Warning: Path is not a git repository: ${projectPath}`);
        // 即使不是Git仓库，我们也允许使用该路径
      }

      // 设置当前项目路径
      this.projectPath = projectPath;

      return { projectPath };
    } catch (error) {
      console.error('Error using local project:', error);
      throw new Error(`Failed to use local project: ${(error as Error).message}`);
    }
  }

  /**
   * 获取项目路径
   * @returns 当前项目路径
   */
  getProjectPath(): string | null {
    return this.projectPath;
  }

  /**
   * 从URL中获取仓库名称
   * @param url 仓库URL
   * @returns 仓库名称
   */
  private getRepositoryNameFromUrl(url: string): string {
    // 移除.git后缀
    const withoutGit = url.replace(/\.git$/, '');

    // 获取最后一部分作为名称
    const parts = withoutGit.split('/');
    let repoName = parts[parts.length - 1];

    // 处理特殊情况
    if (!repoName) {
      repoName = `repo-${Date.now()}`;
    }

    return repoName;
  }
}
