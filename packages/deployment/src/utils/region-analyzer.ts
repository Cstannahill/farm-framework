/**
 * Region Analysis Utility for FARM Deployment
 * Intelligent region selection based on latency, cost, and availability
 */

import type { DeploymentRegion, Platform } from "@farm-framework/types";

export interface RegionAnalysisOptions {
  primaryMarkets?: string[];
  budget?: number;
  latencyRequirements?: "low" | "medium" | "high";
  dataResidency?: string[];
  trafficPatterns?: "global" | "regional" | "local";
  preferredProviders?: Platform[];
}

export interface RegionAnalysisResult {
  recommended: DeploymentRegion[];
  alternatives: Array<{
    region: DeploymentRegion;
    score: number;
    pros: string[];
    cons: string[];
    estimatedLatency: number;
    costMultiplier: number;
  }>;
  reasoning: string[];
  costImpact: {
    lowestCost: DeploymentRegion;
    highestCost: DeploymentRegion;
    savings: number;
  };
}

export interface RegionCapabilities {
  gpu: boolean;
  ai: boolean;
  databases: string[];
  cdn: boolean;
  edgeCompute: boolean;
  compliance: string[];
  availability: number; // percentage
}

export class RegionAnalyzer {
  private regionData: Map<DeploymentRegion, RegionCapabilities>;
  private latencyData: Map<string, Map<DeploymentRegion, number>>;

  constructor() {
    this.initializeRegionData();
    this.initializeLatencyData();
  }

  /**
   * Analyze and recommend optimal regions based on requirements
   */
  async selectRegions(
    options: RegionAnalysisOptions
  ): Promise<RegionAnalysisResult> {
    const scores = await this.calculateRegionScores(options);
    const sortedRegions = Array.from(scores.entries()).sort(
      ([, a], [, b]) => b.score - a.score
    );

    const recommended = sortedRegions.slice(0, 3).map(([region]) => region);

    const alternatives = sortedRegions.slice(3, 8).map(([region, data]) => ({
      region,
      score: data.score,
      pros: data.pros,
      cons: data.cons,
      estimatedLatency: data.latency,
      costMultiplier: data.costMultiplier,
    }));

    const reasoning = this.generateReasoning(options, recommended);
    const costImpact = this.analyzeCostImpact(scores);

    return {
      recommended,
      alternatives,
      reasoning,
      costImpact,
    };
  }

  /**
   * Get latency estimate between user location and region
   */
  async getLatencyEstimate(
    userLocation: string,
    region: DeploymentRegion
  ): Promise<number> {
    const regionLatencies = this.latencyData.get(userLocation);
    return regionLatencies?.get(region) || 150; // fallback estimate
  }

  /**
   * Check if region supports specific capabilities
   */
  getRegionCapabilities(region: DeploymentRegion): RegionCapabilities {
    return this.regionData.get(region) || this.getDefaultCapabilities();
  }

  /**
   * Calculate region scores based on requirements
   */
  private async calculateRegionScores(
    options: RegionAnalysisOptions
  ): Promise<Map<DeploymentRegion, any>> {
    const scores = new Map();
    const regions: DeploymentRegion[] = [
      "us-east-1",
      "us-west-1",
      "us-west-2",
      "eu-west-1",
      "eu-central-1",
      "ap-northeast-1",
      "ap-southeast-1",
    ];

    for (const region of regions) {
      const capabilities = this.getRegionCapabilities(region);
      const latency = await this.getAverageLatency(
        region,
        options.primaryMarkets
      );
      const costMultiplier = this.getCostMultiplier(region);

      let score = 100; // base score
      const pros: string[] = [];
      const cons: string[] = [];

      // Latency scoring
      if (latency < 50) {
        score += 20;
        pros.push("Excellent latency");
      } else if (latency < 100) {
        score += 10;
        pros.push("Good latency");
      } else if (latency > 200) {
        score -= 15;
        cons.push("High latency");
      }

      // Cost scoring
      if (costMultiplier < 1.1) {
        score += 15;
        pros.push("Low cost");
      } else if (costMultiplier > 1.3) {
        score -= 10;
        cons.push("Higher cost");
      }

      // Capability scoring
      if (capabilities.gpu && options.primaryMarkets?.includes("ai")) {
        score += 25;
        pros.push("GPU availability");
      }

      if (capabilities.availability > 99.9) {
        score += 10;
        pros.push("High availability");
      }

      // Compliance and data residency
      if (options.dataResidency) {
        const hasCompliance = options.dataResidency.some((req) =>
          capabilities.compliance.includes(req)
        );
        if (hasCompliance) {
          score += 20;
          pros.push("Compliance requirements met");
        } else {
          score -= 30;
          cons.push("Compliance requirements not met");
        }
      }

      scores.set(region, {
        score: Math.max(0, score),
        latency,
        costMultiplier,
        pros,
        cons,
        capabilities,
      });
    }

    return scores;
  }

  /**
   * Generate human-readable reasoning for recommendations
   */
  private generateReasoning(
    options: RegionAnalysisOptions,
    recommended: DeploymentRegion[]
  ): string[] {
    const reasoning: string[] = [];

    if (options.primaryMarkets?.includes("north-america")) {
      reasoning.push(
        "Prioritized North American regions for primary market coverage"
      );
    }

    if (options.latencyRequirements === "low") {
      reasoning.push("Selected regions with lowest latency to target markets");
    }

    if (options.budget && options.budget < 100) {
      reasoning.push("Chose cost-effective regions to stay within budget");
    }

    if (recommended.includes("us-east-1")) {
      reasoning.push(
        "US East (Virginia) selected for cost efficiency and broad service availability"
      );
    }

    if (recommended.includes("eu-west-1")) {
      reasoning.push(
        "EU West (Ireland) included for European market coverage and GDPR compliance"
      );
    }

    return reasoning;
  }

  /**
   * Analyze cost impact of different region choices
   */
  private analyzeCostImpact(scores: Map<DeploymentRegion, any>): any {
    const regions = Array.from(scores.entries());
    const sortedByCost = regions.sort(
      (a, b) => a[1].costMultiplier - b[1].costMultiplier
    );

    const lowestCost = sortedByCost[0][0];
    const highestCost = sortedByCost[sortedByCost.length - 1][0];
    const savings =
      (sortedByCost[sortedByCost.length - 1][1].costMultiplier -
        sortedByCost[0][1].costMultiplier) *
      100;

    return {
      lowestCost,
      highestCost,
      savings: Math.round(savings),
    };
  }

  /**
   * Get average latency to primary markets
   */
  private async getAverageLatency(
    region: DeploymentRegion,
    primaryMarkets?: string[]
  ): Promise<number> {
    if (!primaryMarkets || primaryMarkets.length === 0) {
      return this.getBaseLatency(region);
    }

    let totalLatency = 0;
    for (const market of primaryMarkets) {
      totalLatency += await this.getLatencyEstimate(market, region);
    }

    return totalLatency / primaryMarkets.length;
  }

  /**
   * Get base latency estimate for region
   */
  private getBaseLatency(region: DeploymentRegion): number {
    const baseLatencies: Record<string, number> = {
      "us-east-1": 80,
      "us-west-1": 90,
      "us-west-2": 85,
      "eu-west-1": 95,
      "eu-central-1": 100,
      "ap-northeast-1": 120,
      "ap-southeast-1": 130,
    };

    return baseLatencies[region] || 150;
  }

  /**
   * Get cost multiplier for region
   */
  private getCostMultiplier(region: DeploymentRegion): number {
    const costMultipliers: Record<string, number> = {
      "us-east-1": 1.0,
      "us-west-1": 1.1,
      "us-west-2": 1.05,
      "eu-west-1": 1.15,
      "eu-central-1": 1.12,
      "ap-northeast-1": 1.25,
      "ap-southeast-1": 1.2,
    };

    return costMultipliers[region] || 1.2;
  }

  /**
   * Initialize region capability data
   */
  private initializeRegionData(): void {
    this.regionData = new Map([
      [
        "us-east-1",
        {
          gpu: true,
          ai: true,
          databases: ["postgresql", "mongodb", "redis"],
          cdn: true,
          edgeCompute: true,
          compliance: ["SOC2", "HIPAA"],
          availability: 99.99,
        },
      ],
      [
        "us-west-2",
        {
          gpu: true,
          ai: true,
          databases: ["postgresql", "mongodb", "redis"],
          cdn: true,
          edgeCompute: true,
          compliance: ["SOC2", "HIPAA"],
          availability: 99.95,
        },
      ],
      [
        "eu-west-1",
        {
          gpu: true,
          ai: true,
          databases: ["postgresql", "mongodb", "redis"],
          cdn: true,
          edgeCompute: true,
          compliance: ["GDPR", "SOC2"],
          availability: 99.95,
        },
      ],
      [
        "eu-central-1",
        {
          gpu: false,
          ai: true,
          databases: ["postgresql", "mongodb"],
          cdn: true,
          edgeCompute: false,
          compliance: ["GDPR", "SOC2"],
          availability: 99.9,
        },
      ],
      [
        "ap-northeast-1",
        {
          gpu: true,
          ai: true,
          databases: ["postgresql", "mongodb", "redis"],
          cdn: true,
          edgeCompute: true,
          compliance: ["SOC2"],
          availability: 99.9,
        },
      ],
      [
        "ap-southeast-1",
        {
          gpu: false,
          ai: true,
          databases: ["postgresql", "mongodb"],
          cdn: true,
          edgeCompute: false,
          compliance: ["SOC2"],
          availability: 99.85,
        },
      ],
    ]);
  }

  /**
   * Initialize latency data between locations and regions
   */
  private initializeLatencyData(): void {
    this.latencyData = new Map([
      [
        "north-america",
        new Map([
          ["us-east-1", 50],
          ["us-west-1", 80],
          ["us-west-2", 70],
          ["eu-west-1", 120],
          ["eu-central-1", 130],
          ["ap-northeast-1", 180],
          ["ap-southeast-1", 200],
        ]),
      ],
      [
        "europe",
        new Map([
          ["us-east-1", 120],
          ["us-west-1", 150],
          ["us-west-2", 140],
          ["eu-west-1", 30],
          ["eu-central-1", 40],
          ["ap-northeast-1", 220],
          ["ap-southeast-1", 200],
        ]),
      ],
      [
        "asia",
        new Map([
          ["us-east-1", 200],
          ["us-west-1", 160],
          ["us-west-2", 150],
          ["eu-west-1", 180],
          ["eu-central-1", 190],
          ["ap-northeast-1", 50],
          ["ap-southeast-1", 40],
        ]),
      ],
    ]);
  }

  /**
   * Get default capabilities for unknown regions
   */
  private getDefaultCapabilities(): RegionCapabilities {
    return {
      gpu: false,
      ai: true,
      databases: ["postgresql"],
      cdn: false,
      edgeCompute: false,
      compliance: ["SOC2"],
      availability: 99.5,
    };
  }
}
