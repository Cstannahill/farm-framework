import { Command } from "commander";
import chalk from "chalk";
import { randomBytes } from "crypto";

/**
 * Create the `farm auth` command namespace with helpful utilities.
 * These CLI subcommands assist with local development tasks such
 * as role inspection and token generation. The heavy lifting of
 * authentication occurs on the API layer, but these helpers
 * streamline manual testing and debugging.
 */
export function createAuthCommands(): Command {
  const auth = new Command("auth");
  auth.description("Authentication utilities");

  auth
    .command("scaffold")
    .description("Scaffold base auth models")
    .action(async () => {
      console.log(chalk.green("Scaffolding authentication models..."));
      // TODO: integrate with generators
    });

  auth
    .command("roles")
    .description("List available roles")
    .action(() => {
      const roles = ["user", "premium_user", "admin"];
      console.log(chalk.cyan("Available roles:"));
      roles.forEach((r) => console.log(` - ${r}`));
    });

  auth
    .command("tokens <token>")
    .description("Validate and inspect a token")
    .action((token: string) => {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString("utf8")
        );
        console.log(chalk.green("Token payload:"));
        console.log(payload);
      } catch {
        console.log(chalk.red("Invalid token"));
      }
    });

  auth
    .command("dev:login <email>")
    .description("Generate a local development token")
    .option("-r, --role <role>", "Role to assign", "admin")
    .action((email: string, options: { role: string }) => {
      const payload = {
        sub: email,
        roles: [options.role],
        permissions: [],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        type: "access" as const,
      };
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
        "base64url"
      );
      const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const token = `${header}.${body}.${randomBytes(8).toString("hex")}`;
      console.log(chalk.yellow(`Dev token for ${email}:`));
      console.log(token);
    });

  return auth;
}
