import { spawn } from "node:child_process";
import path from "node:path";

const androidDir = path.join(process.cwd(), "android");
const command = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

const child = spawn(command, ["assembleDebug", "--stacktrace"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
