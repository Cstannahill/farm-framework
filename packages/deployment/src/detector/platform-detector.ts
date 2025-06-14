import type {
  FarmConfig,
  PlatformRecommendation,
  ProjectAnalysis,
  Platform,
  PlatformScore,
  DeploymentRegion,
} from "@farm-framework/types";
import { GitInfo } from "../utils/git.js";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Intelligent platform detector that analyzes your project and recommends
 * the optimal deployment platform based on your requirements
 */
export class PlatformDetector {
  private config: FarmConfig;
  private gitInfo: GitInfo;
  private workingDir: string;

  constructor(config: FarmConfig, workingDir: string = process.cwd()) {
    this.config = config;
    this.workingDir = workingDir;
    this.gitInfo = new GitInfo(workingDir);
  }

  /**
   * Analyzes the project and returns optimal platform recommendation
   */
  async detectOptimalPlatform(): Promise<PlatformRecommendation> {
    const analysis = await this.analyzeProject();
    const scores = await this.scoreAllPlatforms(analysis);

    // Sort platforms by score
    const sortedPlatforms = scores.sort((a, b) => b.score - a.score);
    const recommended = sortedPlatforms[0];
    const alternatives = sortedPlatforms.slice(1, 4).map((p) => ({
      platform: p.platform,
      description: this.getShortDescription(p),
      score: p.score,
    }));

    return {
      recommended: recommended.platform,
      alternatives,
      reasons: recommended.reasons,
      estimatedCost: await this.estimateMonthlyCost(
        analysis,
        recommended.platform
      ),
      analysis,
    };
  }

  /**
   * Analyzes the current project to understand its requirements
   */
  private async analyzeProject(): Promise<ProjectAnalysis> {
    const packageJson = await this.readPackageJson();
    const hasDocker = await this.hasDockerfile();

    return {
      hasGPU: this.config.ai?.providers?.ollama?.gpu ?? false,
      hasWebSockets: await this.detectWebSockets(),
      estimatedTraffic: await this.estimateTraffic(),
      databaseType: this.config.database?.type ?? "sqlite",
      teamSize: await this.getTeamSize(),
      budget: await this.detectBudgetConstraints(),
      regions: this.config.deployment?.regions ?? ["us-east-1"],
      staticAssets: await this.analyzeStaticAssets(),
      aiWorkload: this.analyzeAIWorkload(),
      hasDocker,
      framework: "farm",
    };
  }

  /**
   * Scores all supported platforms based on project analysis
   */
  private async scoreAllPlatforms(
    analysis: ProjectAnalysis
  ): Promise<PlatformScore[]> {
    const platforms: Platform[] = ["railway", "vercel", "fly", "aws", "gcp"];

    return Promise.all(
      platforms.map(async (platform) => ({
        platform,
        score: await this.scorePlatform(platform, analysis),
        reasons: this.getReasons(platform, analysis),
        pros: this.getPros(platform, analysis),
        cons: this.getCons(platform, analysis),
      }))
    );
  }

  /**
   * Scores a specific platform based on project requirements
   */
  private async scorePlatform(
    platform: Platform,
    analysis: ProjectAnalysis
  ): Promise<number> {
    switch (platform) {
      case "railway":
        return this.scoreRailway(analysis);
      case "vercel":
        return this.scoreVercel(analysis);
      case "fly":
        return this.scoreFly(analysis);
      case "aws":
        return this.scoreAWS(analysis);
      case "gcp":
        return this.scoreGCP(analysis);
      default:
        return 0;
    }
  }

  /**
   * Scores Railway platform
   */
  private scoreRailway(analysis: ProjectAnalysis): number {
    let score = 80; // Great baseline for most projects

    // Penalties
    if (analysis.hasGPU) score -= 30; // No GPU support
    if (analysis.estimatedTraffic > 100000) score -= 15; // Limited scaling
    if (analysis.teamSize > 10) score -= 10; // Better for smaller teams

    // Bonuses
    if (analysis.teamSize <= 5) score += 20; // Perfect for small teams
    if (analysis.budget && analysis.budget < 100) score += 15; // Very affordable
    if (analysis.hasWebSockets) score += 10; // Good WebSocket support
    if (analysis.databaseType === "postgresql") score += 15; // Excellent Postgres support
    if (!analysis.hasDocker) score += 10; // Great buildpack support

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Scores Vercel platform
   */
  private scoreVercel(analysis: ProjectAnalysis): number {
    let score = 75; // Good for frontend-heavy apps

    // Penalties
    if (analysis.hasGPU) score -= 40; // No GPU support
    if (
      analysis.databaseType !== "sqlite" &&
      analysis.databaseType !== "postgresql"
    )
      score -= 20;
    if (analysis.estimatedTraffic > 1000000) score -= 25; // Expensive at scale

    // Bonuses
    if (analysis.staticAssets > 100) score += 25; // Excellent CDN
    if (analysis.framework === "farm") score += 15; // Good Next.js alternative
    if (analysis.regions.length > 1) score += 15; // Global edge network

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Scores Fly.io platform
   */
  private scoreFly(analysis: ProjectAnalysis): number {
    let score = 85; // Excellent for containerized apps

    // Bonuses
    if (analysis.hasGPU) score += 20; // GPU support available
    if (analysis.hasDocker) score += 15; // Container-native
    if (analysis.regions.length > 1) score += 15; // Multi-region support
    if (analysis.hasWebSockets) score += 10; // Good WebSocket support
    if (analysis.estimatedTraffic > 50000) score += 10; // Scales well

    // Penalties
    if (!analysis.hasDocker) score -= 15; // Requires containerization
    if (analysis.teamSize <= 2) score -= 5; // Might be overkill for tiny teams

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Scores AWS platform
   */
  private scoreAWS(analysis: ProjectAnalysis): number {
    let score = 70; // Powerful but complex

    // Bonuses
    if (analysis.estimatedTraffic > 500000) score += 25; // Excellent scaling
    if (analysis.teamSize > 10) score += 20; // Enterprise features
    if (analysis.hasGPU) score += 15; // GPU instances available
    if (analysis.budget && analysis.budget > 500) score += 15; // Worth the complexity

    // Penalties
    if (analysis.teamSize <= 5) score -= 25; // Complex for small teams
    if (!analysis.budget || analysis.budget < 200) score -= 20; // Can get expensive

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Scores Google Cloud Platform
   */
  private scoreGCP(analysis: ProjectAnalysis): number {
    let score = 65; // Good alternative to AWS

    // Bonuses
    if (analysis.hasGPU) score += 20; // Good GPU support
    if (analysis.aiWorkload) score += 15; // AI/ML services
    if (analysis.estimatedTraffic > 200000) score += 15; // Good scaling

    // Penalties
    if (analysis.teamSize <= 5) score -= 20; // Complex for small teams
    if (!analysis.budget || analysis.budget < 150) score -= 15; // Can get expensive

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Helper methods for analysis
   */
  private async detectWebSockets(): Promise<boolean> {
    // Check for WebSocket usage in code
    try {
      const apiPath = path.join(this.workingDir, "apps", "api");
      const files = await this.searchForPattern(
        apiPath,
        /websocket|socket\.io|ws:/i
      );
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async estimateTraffic(): Promise<number> {
    // Basic estimation based on project indicators
    // In a real implementation, this could analyze git history, existing deployments, etc.
    const hasApi = await this.hasDirectory("apps/api");
    const hasWeb = await this.hasDirectory("apps/web");

    let baseTraffic = 1000; // Monthly requests
    if (hasApi) baseTraffic *= 5;
    if (hasWeb) baseTraffic *= 2;

    return baseTraffic;
  }

  private async getTeamSize(): Promise<number> {
    try {
      const contributors = await this.gitInfo.getContributors();
      return Math.max(1, contributors.length);
    } catch {
      return 1;
    }
  }

  private async detectBudgetConstraints(): Promise<number | undefined> {
    // This could analyze package.json, existing deployment configs, etc.
    // For now, return undefined (no constraints)
    return undefined;
  }

  private async analyzeStaticAssets(): Promise<number> {
    try {
      const webPath = path.join(this.workingDir, "apps", "web");
      const staticPaths = ["public", "static", "assets"];

      let totalFiles = 0;
      for (const staticPath of staticPaths) {
        const fullPath = path.join(webPath, staticPath);
        if (await this.hasDirectory(fullPath)) {
          const files = await this.countFiles(fullPath);
          totalFiles += files;
        }
      }

      return totalFiles;
    } catch {
      return 0;
    }
  }

  private analyzeAIWorkload(): boolean {
    return !!(
      this.config.ai?.providers?.openai?.enabled ||
      this.config.ai?.providers?.ollama?.enabled ||
      this.config.ai?.providers?.huggingface?.enabled
    );
  }

  private async estimateMonthlyCost(
    analysis: ProjectAnalysis,
    platform: Platform
  ): Promise<string> {
    // Basic cost estimation logic
    let baseCost = 0;

    switch (platform) {
      case "railway":
        baseCost = analysis.hasGPU ? 50 : 5;
        break;
      case "vercel":
        baseCost = analysis.estimatedTraffic > 100000 ? 20 : 0;
        break;
      case "fly":
        baseCost = analysis.hasGPU ? 100 : 10;
        break;
      case "aws":
        baseCost = analysis.hasGPU ? 200 : 50;
        break;
      case "gcp":
        baseCost = analysis.hasGPU ? 180 : 40;
        break;
    }

    return `$${baseCost}/month`;
  }

  /**
   * Utility methods
   */
  private async readPackageJson(): Promise<any> {
    try {
      const content = await fs.readFile(
        path.join(this.workingDir, "package.json"),
        "utf-8"
      );
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async hasDockerfile(): Promise<boolean> {
    try {
      await fs.access(path.join(this.workingDir, "Dockerfile"));
      return true;
    } catch {
      return false;
    }
  }

  private async hasDirectory(dirPath: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(dirPath)
        ? dirPath
        : path.join(this.workingDir, dirPath);
      const stats = await fs.stat(fullPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private async countFiles(dirPath: string): Promise<number> {
    try {
      const files = await fs.readdir(dirPath, { recursive: true });
      return files.length;
    } catch {
      return 0;
    }
  }

  private async searchForPattern(
    dirPath: string,
    pattern: RegExp
  ): Promise<string[]> {
    const results: string[] = [];
    try {
      const files = await fs.readdir(dirPath, { recursive: true });
      for (const file of files) {
        if (
          typeof file === "string" &&
          (file.endsWith(".ts") || file.endsWith(".js"))
        ) {
          try {
            const content = await fs.readFile(
              path.join(dirPath, file),
              "utf-8"
            );
            if (pattern.test(content)) {
              results.push(file);
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
    return results;
  }

  private getReasons(platform: Platform, analysis: ProjectAnalysis): string[] {
    const reasons: string[] = [];

    switch (platform) {
      case "railway":
        if (analysis.teamSize <= 5) reasons.push("Perfect for small teams");
        if (analysis.databaseType === "postgresql")
          reasons.push("Excellent PostgreSQL support");
        if (!analysis.hasDocker) reasons.push("Great buildpack support");
        break;
      case "vercel":
        if (analysis.staticAssets > 50)
          reasons.push("Excellent CDN performance");
        if (analysis.regions.length > 1) reasons.push("Global edge network");
        break;
      case "fly":
        if (analysis.hasGPU) reasons.push("GPU support available");
        if (analysis.hasDocker) reasons.push("Container-native platform");
        break;
    }

    return reasons;
  }

  private getPros(platform: Platform, analysis: ProjectAnalysis): string[] {
    const pros: string[] = [];

    switch (platform) {
      case "railway":
        pros.push(
          "Simple setup",
          "Great developer experience",
          "Affordable pricing"
        );
        break;
      case "vercel":
        pros.push(
          "Excellent performance",
          "Global CDN",
          "Great for static sites"
        );
        break;
      case "fly":
        pros.push("Multi-region support", "Docker-native", "Good scaling");
        break;
    }

    return pros;
  }

  private getCons(platform: Platform, analysis: ProjectAnalysis): string[] {
    const cons: string[] = [];

    switch (platform) {
      case "railway":
        if (analysis.hasGPU) cons.push("No GPU support");
        if (analysis.estimatedTraffic > 100000)
          cons.push("Limited high-scale support");
        break;
      case "vercel":
        if (analysis.hasGPU) cons.push("No GPU support");
        if (analysis.estimatedTraffic > 500000)
          cons.push("Can get expensive at scale");
        break;
      case "fly":
        if (!analysis.hasDocker) cons.push("Requires containerization");
        break;
    }

    return cons;
  }

  private getShortDescription(platformScore: PlatformScore): string {
    const descriptions: Record<Platform, string> = {
      railway: "Simple, developer-friendly platform",
      vercel: "Edge-optimized for frontend apps",
      fly: "Global container platform",
      aws: "Enterprise-grade cloud platform",
      gcp: "Google's cloud platform",
    };

    return descriptions[platformScore.platform] || "Cloud platform";
  }
}
