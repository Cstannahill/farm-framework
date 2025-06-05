// src/utils/progress.ts
export class ProgressIndicator {
  private spinner: string[] = [
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏",
  ];
  private currentIndex = 0;
  private interval?: NodeJS.Timeout;
  private message: string = "";

  start(message: string): void {
    this.message = message;
    this.currentIndex = 0;

    this.interval = setInterval(() => {
      process.stdout.write(
        `\r${this.spinner[this.currentIndex]} ${this.message}`
      );
      this.currentIndex = (this.currentIndex + 1) % this.spinner.length;
    }, 100);
  }

  update(message: string): void {
    this.message = message;
  }

  succeed(message?: string): void {
    this.stop();
    console.log(`✅ ${message || this.message}`);
  }

  fail(message?: string): void {
    this.stop();
    console.log(`❌ ${message || this.message}`);
  }

  warn(message?: string): void {
    this.stop();
    console.log(`⚠️ ${message || this.message}`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    process.stdout.write("\r\x1b[K"); // Clear current line
  }
}
