import type { Scored } from "../../modules/health-camera/core";

/**
 * The web export has no camera model, so the scan target shows ONE real result instead of a live viewfinder: the CC0
 * photo "Empty plastic bottle" (KDADA, Wikimedia Commons — assets/demo/bottle-demo.credit.json) classified on
 * 2026-10-09 by this engine (core.ts + the same ONNX file, onnxruntime-node). The numbers are that run's cosine
 * scores, copied, not invented. The room check's web demo reads the same ranking.
 */
export const DEMO_PHOTO = require("../../assets/demo/bottle-demo.jpg") as number;
export const DEMO_RESULT: Scored[] = [
  { label: "object:plastic-water-bottle", score: 0.152 },
  { label: "object:shampoo-bottle", score: 0.112 },
  { label: "object:plastic-food-container", score: 0.088 },
  { label: "drink:cola", score: 0.085 },
  { label: "drink:energy-drink", score: 0.073 },
  { label: "object:phone-screen-night", score: 0.068 },
  { label: "object:takeout-container", score: 0.066 },
  { label: "object:glass-food-container", score: 0.062 },
];
