import { describe, it, expect, vi } from "vitest";
import { TemplateValidator } from "../template-validator";
import { spawn } from "child_process";
import { EventEmitter } from "events";

vi.mock("child_process");
const mockSpawn = vi.mocked(spawn);

describe("TemplateValidator runCommand", () => {
  it("resolves with stdout", async () => {
    const validator = new TemplateValidator();
    const proc: any = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    mockSpawn.mockReturnValue(proc);

    const promise = (validator as any).runCommand("echo", ["hi"], "/tmp");
    proc.stdout.emit("data", "hello");
    proc.emit("close", 0);
    const out = await promise;
    expect(out).toContain("hello");
  });
});
