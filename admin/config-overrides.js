const path = require('path');

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

// const cssRuleMatcher = (rule) => rule.test && String(rule.test) === String(/\.css$/);
const cssRuleMatcher = (rule) => rule.test && String(rule.test) === String(/\.(scss|sass)$/);

const createLoaderMatcher = (loader) => (rule) =>
  rule.loader && rule.loader.indexOf(`${path.sep}${loader}${path.sep}`) !== -1;

module.exports = function override(config, env) {
  if (!config.resolve) {
    config.resolve = { plugins: [] };
  }
  if (!config.resolve.plugins) {
    config.resolve.plugins = [];
  }

  const oneOfRule = config.module.rules.findIndex((rule) => rule.oneOf !== undefined);
  if (oneOfRule !== -1) {
    const cssRuleIndex = config.module.rules[oneOfRule].oneOf.findIndex(cssRuleMatcher);
    if (cssRuleIndex !== -1) {
      const cssLoaderIndex = config.module.rules[oneOfRule].oneOf[cssRuleIndex].use.findIndex(
        createLoaderMatcher('css-loader'),
      );
      if (cssLoaderIndex !== -1) {
        config.module.rules[oneOfRule].oneOf[cssRuleIndex].use[cssLoaderIndex].options = Object.assign(
          config.module.rules[oneOfRule].oneOf[cssRuleIndex].use[cssLoaderIndex].options,
          // Override CSS loader options
          { modules: { mode: 'local', localIdentName: '[local]___[hash:base64:4]' } },
        );
      }
    }
  }

  config.resolve.plugins.push(new TsconfigPathsPlugin());

  return config;
};
