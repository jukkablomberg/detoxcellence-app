/**
 * Native linking overrides (FatTonic 1.1.0, HEALTH-TRIO-DAY A12 — the Android start-up crash of Play vc 9).
 *
 * onnxruntime-react-native 1.24.3 ships no react-native.config.js, so React Native autolinking never registers its
 * Android package: Expo links the gradle project (through the package's unimodule.json) but `PackageList` has no
 * `OnnxruntimePackage`, `NativeModules.Onnxruntime` is null, and the package's own binding calls `install()` on it at
 * import → a fatal TypeError while the Scan tab loads. iOS registers itself (RCT_EXPORT_MODULE), which is why only
 * Android crashed. Fixed upstream after 1.24.3 (microsoft/onnxruntime 99e811d); drop this block when the pin moves
 * past a release that carries it — `npm run check:native-link` proves either way. CANONICAL in fattonic (camera engine).
 */
module.exports = {
  dependencies: {
    "onnxruntime-react-native": {
      platforms: {
        android: {
          packageImportPath: "import ai.onnxruntime.reactnative.OnnxruntimePackage;",
          packageInstance: "new OnnxruntimePackage()",
        },
      },
    },
  },
};
