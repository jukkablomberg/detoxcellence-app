// Metro bundles the encoder as an asset (metro.config.js adds "onnx" to assetExts); require() returns its asset id.
declare module "*.onnx" {
  const asset: number;
  export default asset;
}
