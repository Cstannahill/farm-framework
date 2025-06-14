import type { DeploymentError, ErrorDiagnosis } from "@farm-framework/types";

/**
 * Intelligent error handler for deployment failures
 */
export class DeployErrorHandler {
  /**
   * Handle deployment errors with intelligent diagnosis
   */
  handle(error: Error): DeploymentError {
    const diagnosis = this.diagnose(error);

    // Log the error with diagnosis
    console.error("\n❌ Deployment failed\n");
    console.log(`Problem: ${diagnosis.problem}`);
    console.log(`Likely cause: ${diagnosis.cause}`);
    console.log(`Solution: ${diagnosis.solution}`);

    if (diagnosis.commands) {
      console.log("\nTry running:");
      diagnosis.commands.forEach((cmd) => {
        console.log(`  $ ${cmd}`);
      });
    }

    if (diagnosis.documentation) {
      console.log(`\n📚 See: ${diagnosis.documentation}`);
    }

    return {
      code: this.getErrorCode(error),
      message: error.message,
      details: error.stack,
      suggestion: diagnosis.solution,
      commands: diagnosis.commands,
      documentation: diagnosis.documentation,
      recoverable: this.isRecoverable(error),
    };
  }

  /**
   * Diagnose the error and provide helpful information
   */
  private diagnose(error: Error): ErrorDiagnosis {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    // Docker build failures
    if (message.includes("docker build") || message.includes("dockerfile")) {
      return this.diagnoseDockerbuildError(error);
    }

    // Authentication failures
    if (
      message.includes("authentication") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return this.diagnoseAuthError(error);
    }

    // Network/connectivity issues
    if (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("timeout")
    ) {
      return this.diagnoseNetworkError(error);
    }

    // Resource/quota issues
    if (
      message.includes("insufficient") ||
      message.includes("quota") ||
      message.includes("limit")
    ) {
      return this.diagnoseResourceError(error);
    }

    // Platform-specific errors
    if (message.includes("railway")) {
      return this.diagnoseRailwayError(error);
    }

    if (message.includes("vercel")) {
      return this.diagnoseVercelError(error);
    }

    if (message.includes("fly")) {
      return this.diagnoseFlyError(error);
    }

    // AI/GPU specific errors
    if (
      message.includes("gpu") ||
      message.includes("cuda") ||
      message.includes("ollama")
    ) {
      return this.diagnoseAIError(error);
    }

    // Database errors
    if (
      message.includes("database") ||
      message.includes("postgres") ||
      message.includes("mysql")
    ) {
      return this.diagnoseDatabaseError(error);
    }

    // Configuration errors
    if (
      message.includes("config") ||
      message.includes("environment") ||
      message.includes("env")
    ) {
      return this.diagnoseConfigError(error);
    }

    // Generic fallback
    return this.genericDiagnosis(error);
  }

  /**
   * Diagnose Docker build errors
   */
  private diagnoseDockerbuildError(error: Error): ErrorDiagnosis {
    return {
      problem: "Docker build failed",
      cause:
        "Missing dependencies, syntax error in Dockerfile, or build context issues",
      solution:
        "Check the build logs above and fix any errors in your Dockerfile",
      commands: [
        "farm build --verbose",
        "docker build -t farm-app .",
        "docker system prune -f",
      ],
      documentation: "https://farm.dev/docs/deploy/docker",
    };
  }

  /**
   * Diagnose authentication errors
   */
  private diagnoseAuthError(error: Error): ErrorDiagnosis {
    const message = error.message.toLowerCase();

    if (message.includes("railway")) {
      return {
        problem: "Railway authentication failed",
        cause: "Not logged in to Railway or invalid token",
        solution: "Log in to Railway and try again",
        commands: ["railway login", "railway whoami"],
        documentation: "https://docs.railway.app/deploy/cli",
      };
    }

    if (message.includes("vercel")) {
      return {
        problem: "Vercel authentication failed",
        cause: "Not logged in to Vercel or invalid token",
        solution: "Log in to Vercel and try again",
        commands: ["vercel login", "vercel whoami"],
        documentation: "https://vercel.com/docs/cli",
      };
    }

    return {
      problem: "Authentication failed",
      cause: "Invalid credentials or expired token",
      solution: "Re-authenticate with the deployment platform",
      commands: ["farm deploy --login"],
    };
  }

  /**
   * Diagnose network errors
   */
  private diagnoseNetworkError(error: Error): ErrorDiagnosis {
    return {
      problem: "Network connectivity issue",
      cause: "Unable to connect to deployment platform or internet issues",
      solution: "Check your internet connection and try again",
      commands: ["ping google.com", "farm deploy --retry"],
    };
  }

  /**
   * Diagnose resource errors
   */
  private diagnoseResourceError(error: Error): ErrorDiagnosis {
    const message = error.message;

    return {
      problem: "Insufficient resources on target platform",
      cause: `Your app requires more resources than available: ${message}`,
      solution: "Either optimize your app or upgrade your plan",
      commands: ["farm deploy --smaller-instance", "farm cost optimize"],
      documentation: "https://farm.dev/docs/deploy/optimization",
    };
  }

  /**
   * Diagnose Railway-specific errors
   */
  private diagnoseRailwayError(error: Error): ErrorDiagnosis {
    return {
      problem: "Railway deployment failed",
      cause: "Railway-specific deployment issue",
      solution: "Check Railway status and try again",
      commands: ["railway status", "railway logs", "railway redeploy"],
      documentation: "https://docs.railway.app/",
    };
  }

  /**
   * Diagnose Vercel-specific errors
   */
  private diagnoseVercelError(error: Error): ErrorDiagnosis {
    return {
      problem: "Vercel deployment failed",
      cause: "Vercel-specific deployment issue",
      solution: "Check Vercel dashboard and try again",
      commands: ["vercel --prod", "vercel logs"],
      documentation: "https://vercel.com/docs",
    };
  }

  /**
   * Diagnose Fly.io-specific errors
   */
  private diagnoseFlyError(error: Error): ErrorDiagnosis {
    return {
      problem: "Fly.io deployment failed",
      cause: "Fly.io-specific deployment issue",
      solution: "Check Fly.io status and configuration",
      commands: ["fly status", "fly logs", "fly deploy"],
      documentation: "https://fly.io/docs/",
    };
  }

  /**
   * Diagnose AI/GPU errors
   */
  private diagnoseAIError(error: Error): ErrorDiagnosis {
    const message = error.message.toLowerCase();

    if (message.includes("gpu") && message.includes("not available")) {
      return {
        problem: "GPU required but not available on platform",
        cause: "Ollama requires GPU for optimal performance",
        solution: "Either disable GPU mode or choose a GPU-enabled platform",
        commands: [
          "farm deploy fly --gpu",
          "farm config set ai.providers.ollama.gpu false",
        ],
        documentation: "https://farm.dev/docs/deploy/gpu",
      };
    }

    return {
      problem: "AI service deployment failed",
      cause: "AI provider configuration or resource issue",
      solution: "Check AI provider configuration and resource requirements",
      commands: ["farm ai test", "farm config show ai"],
      documentation: "https://farm.dev/docs/ai/deployment",
    };
  }

  /**
   * Diagnose database errors
   */
  private diagnoseDatabaseError(error: Error): ErrorDiagnosis {
    return {
      problem: "Database deployment or connection failed",
      cause: "Database configuration, connection, or migration issue",
      solution: "Check database configuration and connection string",
      commands: [
        "farm db status",
        "farm db migrate",
        "farm config show database",
      ],
      documentation: "https://farm.dev/docs/database/deployment",
    };
  }

  /**
   * Diagnose configuration errors
   */
  private diagnoseConfigError(error: Error): ErrorDiagnosis {
    return {
      problem: "Configuration error",
      cause: "Missing or invalid configuration values",
      solution: "Check your farm.config.ts and environment variables",
      commands: ["farm config validate", "farm config show", "farm env check"],
      documentation: "https://farm.dev/docs/configuration",
    };
  }

  /**
   * Generic diagnosis for unknown errors
   */
  private genericDiagnosis(error: Error): ErrorDiagnosis {
    return {
      problem: "Deployment failed",
      cause: error.message || "Unknown error occurred",
      solution: "Check the error details and try again with verbose logging",
      commands: ["farm deploy --verbose", "farm deploy --force"],
      documentation: "https://farm.dev/docs/troubleshooting",
    };
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes("docker")) return "DOCKER_BUILD_FAILED";
    if (message.includes("authentication")) return "AUTHENTICATION_FAILED";
    if (message.includes("network")) return "NETWORK_ERROR";
    if (message.includes("insufficient")) return "INSUFFICIENT_RESOURCES";
    if (message.includes("gpu")) return "GPU_NOT_AVAILABLE";
    if (message.includes("database")) return "DATABASE_ERROR";
    if (message.includes("timeout")) return "TIMEOUT_ERROR";
    if (message.includes("config")) return "CONFIGURATION_ERROR";

    return "DEPLOYMENT_FAILED";
  }

  /**
   * Determine if error is recoverable
   */
  private isRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Non-recoverable errors
    if (message.includes("authentication")) return false;
    if (message.includes("forbidden")) return false;
    if (message.includes("quota exceeded")) return false;

    // Most other errors are potentially recoverable
    return true;
  }
}
