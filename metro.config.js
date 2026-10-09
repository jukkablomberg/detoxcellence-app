// Metro config: the default Expo config + the health-camera encoder (.onnx) bundled as an asset.
// The file itself is fetched and sha256-verified by scripts/fetch-camera-model.mjs (not in git).
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("onnx");

module.exports = config;
