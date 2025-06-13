import type {
  Alert,
  AlertChannel,
  AlertChannelConfig,
  AlertNotification,
  NotificationResult,
} from "@farm-framework/types";

export abstract class BaseAlertChannel implements AlertChannel {
  public abstract readonly type: "email" | "slack" | "webhook" | "console";
  protected config: AlertChannelConfig;
  protected rateLimiter: Map<string, number[]> = new Map();

  constructor(
    public readonly name: string,
    config: AlertChannelConfig
  ) {
    this.config = {
      enabled: true,
      rateLimitPerHour: 10,
      minSeverity: "info",
      ...config,
    };
  }

  get enabled(): boolean {
    return this.config.enabled ?? true;
  }

  async send(alert: Alert): Promise<NotificationResult> {
    // Check if channel is enabled
    if (!this.config.enabled) {
      return {
        success: false,
        channel: this.name,
        error: "Channel is disabled",
      };
    }

    // Check severity threshold
    if (!this.shouldSendBySeverity(alert.severity)) {
      return {
        success: false,
        channel: this.name,
        error: "Below severity threshold",
      };
    }

    // Check rate limit
    if (!this.checkRateLimit(alert.rule)) {
      return {
        success: false,
        channel: this.name,
        error: "Rate limit exceeded",
      };
    }

    try {
      // Format and send notification
      const notification = this.formatNotification(alert);
      await this.sendNotification(notification);

      return {
        success: true,
        channel: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        channel: this.name,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  protected abstract sendNotification(
    notification: AlertNotification
  ): Promise<void>;

  protected formatNotification(alert: Alert): AlertNotification {
    return {
      title: this.formatTitle(alert),
      message: this.formatMessage(alert),
      severity: alert.severity,
      timestamp: alert.timestamp,
      metadata: alert.metadata,
      actions: alert.actions,
    };
  }

  protected formatTitle(alert: Alert): string {
    const emoji = this.getSeverityEmoji(alert.severity);
    return `${emoji} [${alert.severity.toUpperCase()}] ${alert.title}`;
  }

  protected formatMessage(alert: Alert): string {
    let message = alert.message;

    if (alert.analysis) {
      message += "\n\n**Analysis:**\n" + alert.analysis;
    }

    if (alert.recommendations && alert.recommendations.length > 0) {
      message += "\n\n**Recommendations:**\n";
      alert.recommendations.forEach((rec, i) => {
        message += `${i + 1}. ${rec}\n`;
      });
    }

    return message;
  }

  private shouldSendBySeverity(severity: Alert["severity"]): boolean {
    const severityLevels = ["info", "warning", "error", "critical"];
    const minLevel = severityLevels.indexOf(this.config.minSeverity!);
    const alertLevel = severityLevels.indexOf(severity);
    return alertLevel >= minLevel;
  }

  private checkRateLimit(ruleId: string): boolean {
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Get timestamps for this rule
    let timestamps = this.rateLimiter.get(ruleId) || [];

    // Remove old timestamps
    timestamps = timestamps.filter((t) => t > hourAgo);

    // Check if under limit
    if (timestamps.length >= this.config.rateLimitPerHour!) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);
    this.rateLimiter.set(ruleId, timestamps);

    return true;
  }

  private getSeverityEmoji(severity: Alert["severity"]): string {
    switch (severity) {
      case "info":
        return "ℹ️";
      case "warning":
        return "⚠️";
      case "error":
        return "🚨";
      case "critical":
        return "🔴";
    }
  }
}

/**
 * Console Alert Channel for development
 */
export class ConsoleAlertChannel extends BaseAlertChannel {
  public readonly type = "console" as const;

  constructor(config: AlertChannelConfig = {}) {
    super("console", config);
  }

  protected async sendNotification(
    notification: AlertNotification
  ): Promise<void> {
    const color = this.getConsoleColor(notification.severity);

    console.log("");
    console.log(color("━".repeat(50)));
    console.log(color(notification.title));
    console.log(color("━".repeat(50)));
    console.log(notification.message);

    if (notification.actions && notification.actions.length > 0) {
      console.log("\n📌 Actions:");
      notification.actions.forEach((action) => {
        console.log(`  • ${action.label}: ${action.url || action.action}`);
      });
    }

    console.log(color("━".repeat(50)));
    console.log("");
  }

  private getConsoleColor(
    severity: Alert["severity"]
  ): (text: string) => string {
    // Simple color function for console
    const colors = {
      info: (text: string) => `\x1b[36m${text}\x1b[0m`, // Cyan
      warning: (text: string) => `\x1b[33m${text}\x1b[0m`, // Yellow
      error: (text: string) => `\x1b[31m${text}\x1b[0m`, // Red
      critical: (text: string) => `\x1b[41m\x1b[37m${text}\x1b[0m`, // White on Red
    };

    return colors[severity];
  }
}

/**
 * Slack Alert Channel
 */
export class SlackAlertChannel extends BaseAlertChannel {
  public readonly type = "slack" as const;
  private webhookUrl: string;

  constructor(webhookUrl: string, config: AlertChannelConfig = {}) {
    super("slack", config);
    this.webhookUrl = webhookUrl;
  }

  protected async sendNotification(
    notification: AlertNotification
  ): Promise<void> {
    const payload = {
      text: notification.title,
      attachments: [
        {
          color: this.getSlackColor(notification.severity),
          text: notification.message,
          fields: this.formatMetadataFields(notification.metadata),
          footer: "FARM Observability",
          ts: Math.floor(notification.timestamp.getTime() / 1000),
          actions: notification.actions?.map((action) => ({
            type: "button",
            text: action.label,
            url: action.url,
            style: action.primary ? "primary" : "default",
          })),
        },
      ],
    };

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
  }

  private getSlackColor(severity: Alert["severity"]): string {
    const colors = {
      info: "#36a64f",
      warning: "#ff9900",
      error: "#ff0000",
      critical: "#8b0000",
    };
    return colors[severity];
  }

  private formatMetadataFields(metadata?: Record<string, any>): any[] {
    if (!metadata) return [];

    return Object.entries(metadata)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({
        title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        value: String(value),
        short: String(value).length < 40,
      }));
  }
}

/**
 * Email Alert Channel
 */
export class EmailAlertChannel extends BaseAlertChannel {
  public readonly type = "email" as const;
  private emailConfig: {
    from: string;
    to: string[];
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
  };

  constructor(
    emailConfig: EmailAlertChannel["emailConfig"],
    config: AlertChannelConfig = {}
  ) {
    super("email", config);
    this.emailConfig = emailConfig;
  }

  protected async sendNotification(
    notification: AlertNotification
  ): Promise<void> {
    // In a real implementation, you'd use nodemailer or similar
    // This is a placeholder showing the structure
    const emailHtml = this.generateEmailHtml(notification);

    // Example with nodemailer (not imported here):
    // const transporter = nodemailer.createTransporter(this.emailConfig.smtp);
    // await transporter.sendMail({
    //   from: this.emailConfig.from,
    //   to: this.emailConfig.to,
    //   subject: notification.title,
    //   html: emailHtml,
    // });

    console.log("Email would be sent:", {
      to: this.emailConfig.to,
      subject: notification.title,
    });
  }

  private generateEmailHtml(notification: AlertNotification): string {
    const severityColors = {
      info: "#17a2b8",
      warning: "#ffc107",
      error: "#dc3545",
      critical: "#721c24",
    };

    return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { 
        background-color: ${severityColors[notification.severity]}; 
        color: white; 
        padding: 20px; 
        border-radius: 5px 5px 0 0;
      }
      .content { 
        background-color: #f8f9fa; 
        padding: 20px; 
        border: 1px solid #dee2e6;
        border-radius: 0 0 5px 5px;
      }
      .metadata { 
        background-color: white; 
        padding: 15px; 
        margin: 15px 0;
        border-radius: 5px;
      }
      .actions { margin-top: 20px; }
      .action-button {
        display: inline-block;
        padding: 10px 20px;
        margin-right: 10px;
        background-color: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      }
      .footer { 
        margin-top: 20px; 
        padding-top: 20px; 
        border-top: 1px solid #dee2e6;
        font-size: 12px;
        color: #6c757d;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>${notification.title}</h2>
      </div>
      <div class="content">
        <p>${notification.message.replace(/\n/g, "<br>")}</p>
        
        ${
          notification.metadata
            ? `
        <div class="metadata">
          <h4>Details:</h4>
          ${Object.entries(notification.metadata)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join("<br>")}
        </div>
        `
            : ""
        }
        
        ${
          notification.actions && notification.actions.length > 0
            ? `
        <div class="actions">
          ${notification.actions
            .map(
              (action) => `
            <a href="${action.url || "#"}" class="action-button">${action.label}</a>
          `
            )
            .join("")}
        </div>
        `
            : ""
        }
        
        <div class="footer">
          <p>This alert was sent by FARM Observability at ${notification.timestamp.toISOString()}</p>
        </div>
      </div>
    </div>
  </body>
  </html>`;
  }
}

/**
 * Discord Alert Channel
 */
export class DiscordAlertChannel extends BaseAlertChannel {
  public readonly type = "webhook" as const;
  private webhookUrl: string;

  constructor(webhookUrl: string, config: AlertChannelConfig = {}) {
    super("discord", config);
    this.webhookUrl = webhookUrl;
  }

  protected async sendNotification(
    notification: AlertNotification
  ): Promise<void> {
    const embed = {
      title: notification.title,
      description: notification.message,
      color: this.getDiscordColor(notification.severity),
      timestamp: notification.timestamp.toISOString(),
      footer: {
        text: "FARM Observability",
      },
      fields: this.formatDiscordFields(notification.metadata),
    };

    const payload = {
      embeds: [embed],
      components: notification.actions
        ? [
            {
              type: 1,
              components: notification.actions.slice(0, 5).map((action) => ({
                type: 2,
                style: action.primary ? 1 : 2,
                label: action.label,
                url: action.url,
              })),
            },
          ]
        : undefined,
    };

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }
  }

  private getDiscordColor(severity: Alert["severity"]): number {
    const colors = {
      info: 0x3498db, // Blue
      warning: 0xf39c12, // Orange
      error: 0xe74c3c, // Red
      critical: 0x992d22, // Dark Red
    };
    return colors[severity];
  }

  private formatDiscordFields(metadata?: Record<string, any>): any[] {
    if (!metadata) return [];

    return Object.entries(metadata)
      .slice(0, 25) // Discord limit
      .map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        value: String(value).substring(0, 1024), // Discord limit
        inline: String(value).length < 40,
      }));
  }
}

/**
 * Alert Channel Manager
 */
export class AlertChannelManager {
  private channels: Map<string, AlertChannel> = new Map();

  register(channel: AlertChannel): void {
    this.channels.set(channel.name, channel);
  }

  unregister(name: string): void {
    this.channels.delete(name);
  }

  async broadcast(alert: Alert): Promise<NotificationResult[]> {
    const results = await Promise.allSettled(
      Array.from(this.channels.values()).map((channel) => channel.send(alert))
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        const channel = Array.from(this.channels.values())[index];
        return {
          success: false,
          channel: channel.name,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown error",
        };
      }
    });
  }

  getChannel(name: string): AlertChannel | undefined {
    return this.channels.get(name);
  }

  listChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}
