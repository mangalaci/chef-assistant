/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Native ONNX runtime for the reranker: load from node_modules at
    // runtime instead of bundling it with webpack.
    serverComponentsExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
  },
};

export default nextConfig;
