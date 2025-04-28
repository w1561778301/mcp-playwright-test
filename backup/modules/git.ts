import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import { GitOptions, GitCredentials } from '../types';

/**
 * Git module for repository operations
 */
export class GitModule {
  private git: SimpleGit | null = null;
  private options: GitOptions = {};
  private projectPath: string | null = null;

  constructor(options: GitOptions = {}) {
    this.options = options;
  }

  /**
   * Clone a Git repository
   * @param url Repository URL
   * @param credentials Optional credentials for authentication
   * @returns Path to cloned repository
   */
  async cloneRepository(url: string, credentials?: GitCredentials): Promise<string> {
    // Create temp directory if not already set
    if (!this.projectPath) {
      this.projectPath = path.join(process.cwd(), 'temp', Date.now().toString());
      fs.mkdirSync(this.projectPath, { recursive: true });
    }

    // Initialize git
    this.git = simpleGit();

    // Set up credentials if provided
    let cloneUrl = url;
    if (credentials) {
      if (credentials.username && credentials.password) {
        // Handle HTTPS authentication
        const urlObj = new URL(url);
        const authUrl = new URL(url);
        authUrl.username = credentials.username;
        authUrl.password = credentials.password;
        cloneUrl = authUrl.toString();
      } else if (credentials.sshKey) {
        // Handle SSH authentication
        // This is a simplified approach, in practice you'd need to set up SSH keys properly
        const sshKeyPath = path.join(process.cwd(), 'temp', 'ssh-key');
        fs.writeFileSync(sshKeyPath, credentials.sshKey, { mode: 0o600 });
        // Set SSH command with key
        await this.git.env('GIT_SSH_COMMAND', `ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no`);
      }
    }

    // Configure git with options
    const gitOptions: any = {};
    if (this.options.depth) {
      gitOptions['--depth'] = this.options.depth;
    }

    // Clone repository
    await this.git.clone(cloneUrl, this.projectPath, gitOptions);

    // Checkout branch if specified
    if (this.options.branch) {
      await this.git.cwd(this.projectPath).checkout(this.options.branch);
    }

    return this.projectPath;
  }

  /**
   * Use an existing local project
   * @param localPath Path to local project
   * @returns Validated path to project
   */
  async useLocalProject(localPath: string): Promise<string> {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Project path does not exist: ${localPath}`);
    }

    this.projectPath = path.resolve(localPath);

    // Check if it's a git repository and initialize git if it is
    if (fs.existsSync(path.join(localPath, '.git'))) {
      this.git = simpleGit(localPath);
    }

    return this.projectPath;
  }

  /**
   * Get the current project path
   * @returns Path to the current project
   */
  getProjectPath(): string | null {
    return this.projectPath;
  }

  /**
   * Clean up temporary resources
   */
  async cleanup(): Promise<void> {
    // Clean up temp files if we created them
    if (this.projectPath && this.projectPath.includes('temp') && fs.existsSync(this.projectPath)) {
      // In a production environment, you might want to be more careful with rm -rf
      fs.rmSync(this.projectPath, { recursive: true, force: true });
      this.projectPath = null;
    }
  }
}
