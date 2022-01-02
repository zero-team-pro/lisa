const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = function override(config, env) {
  if (!config.resolve) {
    config.resolve = { plugins: [] };
  }
  if (!config.resolve.plugins) {
    config.resolve.plugins = [];
  }

  config.resolve.plugins.push(new TsconfigPathsPlugin());

  return config;
};
