import { DetectionProvider } from "./types";
import { DemoDetectionProvider } from "./DemoDetectionProvider";
import { HashDetectionProvider } from "./HashDetectionProvider";

export * from "./types";
export * from "./DemoDetectionProvider";
export * from "./HashDetectionProvider";

export function getDetectionProvider(mode: "DEMO" | "LIVE" = "DEMO"): DetectionProvider {
  if (mode === "LIVE") {
    return new HashDetectionProvider();
  }
  return new DemoDetectionProvider();
}
