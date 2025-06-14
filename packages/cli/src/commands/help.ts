// packages/cli/src/commands/help.ts
import { Command } from "commander";
import { styles, icons, format } from "../utils/styling.js";

export function createHelpCommand(): Command {
  const helpCmd = new Command("help");

  helpCmd
    .description("Show help information for FARM CLI")
    .argument("[topic]", "Help topic (templates, features, examples)")
    .action(showHelp);

  return helpCmd;
}

export function showHelp(topic?: string): void {
  if (!topic) {
    showGeneralHelp();
  } else {
    switch (topic.toLowerCase()) {
      case "templates":
        showTemplateHelp();
        break;
      case "features":
        showFeatureHelp();
        break;
      case "examples":
        showExampleHelp();
        break;
      case "deploy":
      case "deployment":
        showDeploymentHelp();
        break;
      default:
        console.error(`Unknown help topic: ${topic}`);
        showGeneralHelp();
    }
  }
}

function showGeneralHelp(): void {
  console.log(styles.title(`\n${icons.farm} FARM Stack Framework CLI`));
  console.log(styles.muted("AI-first full-stack development\n"));

  console.log(styles.subtitle("🚀 Quick Start:"));
  console.log(styles.muted("─".repeat(40)));
  const quickStart = ["farm create my-app", "cd my-app", "farm dev"];
  console.log(format.numberedList(quickStart, "info"));

  console.log(styles.subtitle("\n📋 Main Commands:"));
  console.log(styles.muted("─".repeat(40)));
  const commands = [
    "create <name>     Create a new FARM application",
    "dev               Start development server",
    "build             Build for production",
    "deploy            Deploy to cloud platforms",
    "generate          Generate code components",
    "help <topic>      Show detailed help",
  ];
  console.log(format.bulletList(commands, "command"));

  console.log(styles.subtitle("\n📚 Help Topics:"));
  console.log(styles.muted("─".repeat(40)));
  const helpTopics = [
    "farm help templates    Available project templates",
    "farm help features     Available feature flags",
    "farm help deployment   Deployment platforms and commands",
    "farm help examples     Usage examples",
  ];
  console.log(format.bulletList(helpTopics, "info"));

  console.log(styles.subtitle("\n🌐 Resources:"));
  console.log(styles.muted("─".repeat(40)));
  console.log(
    styles.info(`   Documentation: ${styles.url("https://farm-stack.dev")}`)
  );
  console.log(
    styles.info(
      `   GitHub:        ${styles.url("https://github.com/farm-stack/framework")}`
    )
  );
  console.log(
    styles.info(
      `   Discord:       ${styles.url("https://discord.gg/farm-stack")}`
    )
  );

  console.log();
}

function showTemplateHelp(): void {
  console.log(styles.title(`\n${icons.folder} FARM Templates`));
  console.log(
    styles.muted("Choose the perfect starting point for your project\n")
  );

  const templates = [
    {
      name: "basic",
      title: "Basic Web App",
      description: "Simple React + FastAPI + MongoDB setup",
      ideal: "Learning FARM, simple applications",
    },
    {
      name: "ai-chat",
      title: "AI Chat Application",
      description: "Chat interface with AI/ML capabilities",
      ideal: "Chatbots, AI assistants, customer support",
    },
    {
      name: "ai-dashboard",
      title: "AI Dashboard",
      description: "Analytics dashboard with ML insights",
      ideal: "Data analysis, business intelligence, reporting",
    },
    {
      name: "ecommerce",
      title: "E-commerce Platform",
      description: "Online store with payment processing",
      ideal: "Online shops, marketplaces, subscription services",
    },
    {
      name: "cms",
      title: "Content Management System",
      description: "Blog/CMS with admin interface",
      ideal: "Blogs, news sites, content-heavy applications",
    },
    {
      name: "api-only",
      title: "API Only (Backend)",
      description: "FastAPI backend without frontend",
      ideal: "Microservices, API development, mobile backends",
    },
  ];

  templates.forEach((template) => {
    console.log(
      styles.emphasis(`${template.name.toUpperCase()}: ${template.title}`)
    );
    console.log(styles.info(`   ${template.description}`));
    console.log(styles.muted(`   Best for: ${template.ideal}`));
    console.log(
      styles.command(
        `   Usage: farm create my-app --template ${template.name}\n`
      )
    );
  });

  console.log(styles.subtitle("💡 Pro Tips:"));
  console.log(styles.muted("─".repeat(40)));
  const tips = [
    "Use --no-interactive for automated scripts",
    "Combine templates with --features for customization",
    "All templates support TypeScript by default",
  ];
  console.log(format.bulletList(tips, "info"));
  console.log();
}

function showFeatureHelp(): void {
  console.log(styles.title(`\n${icons.gear} FARM Features`));
  console.log(styles.muted("Extend your application with powerful features\n"));

  const features = [
    {
      name: "auth",
      title: "Authentication & User Management",
      description: "JWT authentication, user registration, role-based access",
      includes: [
        "JWT tokens",
        "User models",
        "Protected routes",
        "Role management",
      ],
    },
    {
      name: "ai",
      title: "AI/ML Integration",
      description: "AI model serving, inference endpoints, Ollama integration",
      includes: [
        "Ollama support",
        "OpenAI integration",
        "Model management",
        "Streaming responses",
      ],
    },
    {
      name: "realtime",
      title: "Real-time Features",
      description: "WebSocket support for live updates and collaboration",
      includes: [
        "WebSocket server",
        "Real-time notifications",
        "Live chat",
        "Collaborative features",
      ],
    },
    {
      name: "payments",
      title: "Payment Processing",
      description: "Stripe integration for subscriptions and one-time payments",
      includes: [
        "Stripe integration",
        "Subscription management",
        "Webhook handling",
        "Payment forms",
      ],
    },
    {
      name: "email",
      title: "Email Service",
      description: "Transactional emails, templates, and delivery tracking",
      includes: [
        "Email templates",
        "SMTP configuration",
        "Delivery tracking",
        "Bulk sending",
      ],
    },
    {
      name: "storage",
      title: "File Storage",
      description: "File upload, cloud storage, and media management",
      includes: [
        "File uploads",
        "Cloud storage",
        "Image processing",
        "CDN integration",
      ],
    },
    {
      name: "search",
      title: "Full-text Search",
      description: "Elasticsearch integration for powerful search capabilities",
      includes: [
        "Text search",
        "Faceted search",
        "Search analytics",
        "Auto-complete",
      ],
    },
    {
      name: "analytics",
      title: "Analytics",
      description: "User tracking, event analytics, and reporting",
      includes: [
        "Event tracking",
        "User analytics",
        "Custom metrics",
        "Reporting dashboard",
      ],
    },
  ];

  features.forEach((feature) => {
    console.log(
      styles.emphasis(`${feature.name.toUpperCase()}: ${feature.title}`)
    );
    console.log(styles.info(`   ${feature.description}`));
    console.log(styles.muted(`   Includes: ${feature.includes.join(", ")}`));
    console.log(
      styles.command(
        `   Usage: farm create my-app --features ${feature.name}\n`
      )
    );
  });

  console.log(styles.subtitle("🔗 Combining Features:"));
  console.log(styles.muted("─".repeat(40)));
  const examples = [
    "farm create my-app --features auth,ai",
    "farm create shop --template ecommerce --features auth,payments,email",
    "farm create dashboard --template ai-dashboard --features ai,auth,analytics",
  ];
  console.log(format.bulletList(examples, "command"));
  console.log();
}

function showExampleHelp(): void {
  console.log(styles.title(`\n${icons.rocket} FARM CLI Examples`));
  console.log(styles.muted("Common usage patterns and workflows\n"));

  console.log(styles.subtitle("🎯 Interactive Mode (Recommended):"));
  console.log(styles.muted("─".repeat(40)));
  console.log(styles.command("   farm create my-app"));
  console.log(
    styles.muted("   → Prompts for all options with smart defaults\n")
  );

  console.log(styles.subtitle("⚡ Quick Templates:"));
  console.log(styles.muted("─".repeat(40)));
  const quickTemplates = [
    "farm create blog --template cms",
    "farm create chatbot --template ai-chat",
    "farm create shop --template ecommerce",
    "farm create api --template api-only",
  ];
  console.log(format.bulletList(quickTemplates, "command"));

  console.log(styles.subtitle("\n🎛️ Custom Configurations:"));
  console.log(styles.muted("─".repeat(40)));
  const customConfigs = [
    "farm create my-app --template ai-chat --features auth,ai,realtime",
    "farm create my-app --database postgresql --no-docker",
    "farm create my-app --features auth,payments --no-typescript",
  ];
  console.log(format.bulletList(customConfigs, "command"));

  console.log(styles.subtitle("\n🤖 Automation & CI/CD:"));
  console.log(styles.muted("─".repeat(40)));
  const automation = [
    "farm create my-app --template basic --no-interactive --no-install",
    "farm create api --template api-only --features auth,ai --no-git",
    "farm create prod-app --template ecommerce --features auth,payments,email --no-interactive",
  ];
  console.log(format.bulletList(automation, "command"));

  console.log(styles.subtitle("\n📊 Development Workflow:"));
  console.log(styles.muted("─".repeat(40)));
  const workflow = [
    "Create project: farm create my-app --template ai-chat",
    "Start development: cd my-app && farm dev",
    "Generate components: farm generate component UserProfile",
    "Build for production: farm build --production",
    "Deploy: farm deploy --platform vercel",
  ];
  console.log(format.numberedList(workflow, "info"));

  console.log(styles.subtitle("\n💡 Advanced Tips:"));
  console.log(styles.muted("─".repeat(40)));
  const tips = [
    "Use --verbose for detailed output during creation",
    "Combine --no-install with --no-interactive for CI environments",
    "Template auto-enables related features (e.g., ai-chat enables ai feature)",
    "Use farm help <topic> for detailed information on specific topics",
  ];
  console.log(format.bulletList(tips, "info"));
  console.log();
}

function showDeploymentHelp(): void {
  console.log(styles.title(`\n${icons.rocket} FARM Deployment Help`));
  console.log(styles.muted("Zero-configuration cloud deployment\n"));

  console.log(styles.subtitle("🚀 Quick Deployment:"));
  console.log(styles.muted("─".repeat(40)));
  const quickDeploy = [
    "farm deploy                    # Auto-detect best platform",
    "farm deploy wizard             # Interactive setup wizard",
    "farm deploy --platform railway # Deploy to specific platform",
  ];
  console.log(format.bulletList(quickDeploy, "command"));

  console.log(styles.subtitle("\n🎯 Supported Platforms:"));
  console.log(styles.muted("─".repeat(40)));
  const platforms = [
    "railway    - Full-stack with GPU support for AI workloads",
    "fly        - Global edge deployment with GPU support",
    "vercel     - Serverless frontend with API routes",
    "aws        - Enterprise cloud with full AWS ecosystem",
    "gcp        - Google Cloud with AI/ML services",
  ];
  console.log(format.bulletList(platforms, "info"));

  console.log(styles.subtitle("\n⚙️  Main Deploy Commands:"));
  console.log(styles.muted("─".repeat(40)));
  const commands = [
    "farm deploy                    # Deploy with auto-detection",
    "farm deploy list               # List all deployments",
    "farm deploy status <id>        # Check deployment status",
    "farm deploy logs <id>          # View deployment logs",
    "farm deploy rollback <id>      # Rollback deployment",
    "farm deploy cost estimate      # Estimate costs",
    "farm deploy wizard             # Interactive setup",
  ];
  console.log(format.bulletList(commands, "command"));

  console.log(styles.subtitle("\n🔧 Common Options:"));
  console.log(styles.muted("─".repeat(40)));
  const options = [
    "--platform <platform>         # Specify deployment platform",
    "--environment <env>           # Target environment (dev/staging/prod)",
    "--region <region>             # Deployment region",
    "--gpu                         # Enable GPU support for AI workloads",
    "--preview                     # Deploy as preview/staging",
    "--yes                         # Skip confirmation prompts",
    "--dry-run                     # Show what would be deployed",
    "--verbose                     # Enable detailed logging",
  ];
  console.log(format.bulletList(options, "info"));

  console.log(styles.subtitle("\n📊 Examples:"));
  console.log(styles.muted("─".repeat(40)));
  const examples = [
    "farm deploy --platform railway --gpu --region us-west-1",
    "farm deploy --preview --branch feature/new-ai-model",
    "farm deploy --production --yes --domains api.myapp.com",
    "farm deploy rollback prod-123 --yes",
  ];
  console.log(format.bulletList(examples, "command"));

  console.log(styles.subtitle("\n💰 Cost Management:"));
  console.log(styles.muted("─".repeat(40)));
  const costCommands = [
    "farm deploy cost estimate     # Get cost estimates before deploying",
    "farm deploy cost current      # View current monthly costs",
    "farm deploy cost optimize     # Get optimization recommendations",
  ];
  console.log(format.bulletList(costCommands, "command"));

  console.log(styles.subtitle("\n🎯 AI-Optimized Features:"));
  console.log(styles.muted("─".repeat(40)));
  const aiFeatures = [
    "Automatic GPU detection and allocation for AI workloads",
    "Intelligent platform recommendations based on AI requirements",
    "Cost optimization for AI model serving",
    "Automatic Ollama setup and model provisioning",
    "Edge deployment optimization for AI inference",
  ];
  console.log(format.bulletList(aiFeatures, "info"));

  console.log(styles.subtitle("\n💡 Pro Tips:"));
  console.log(styles.muted("─".repeat(40)));
  const tips = [
    "Use 'farm deploy wizard' for first-time deployment setup",
    "Enable --gpu flag for applications using local AI models",
    "Use --dry-run to preview deployment changes safely",
    "Set up custom domains with --domains for production",
    "Monitor costs regularly with 'farm deploy cost current'",
  ];
  console.log(format.bulletList(tips, "info"));
  console.log();
}
