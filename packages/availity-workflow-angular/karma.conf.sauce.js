const settings = require('availity-workflow-settings');

const webpackConfig = require('./webpack.config.test');

const karmaConfig = {
  basePath: settings.app(),

  frameworks: ['jasmine'],

  files: [{ pattern: 'specs-bundle.js', watched: false }],

  reportSlowerThan: 500,

  preprocessors: {
    'specs-bundle.js': ['webpack', 'sourcemap']
  },

  webpack: webpackConfig,

  webpackMiddleware: {
    stats: 'errors-only',
    quiet: true
  },

  exclude: ['*.scss', '*.css', '*.less'],

  client: {
    // log console output in our test console
    captureConsole: true
  },

  captureTimeout: 120000,

  browserNoActivityTimeout: 60000, // 60 seconds

  reporters: ['spec', 'saucelabs'],

  port: 9876,

  colors: true,

  autoWatch: false,

  singleRun: true,

  // List plugins explicitly, since auto-loading karma-webpack won't work here
  plugins: [
    // eslint-disable-next-line import/no-extraneous-dependencies
    require('karma-sauce-launcher'),
    require('karma-jasmine'),
    require('karma-spec-reporter'),
    require('karma-coverage-istanbul-reporter'),
    require('karma-webpack'),
    require('karma-sourcemap-loader')
  ]
};

module.exports = config => {
  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    /* eslint no-console: 0 */
    console.log('Make sure the SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables are set.');
    /* eslint no-process-exit:0 */
    process.exit(1);
  }

  // Browsers to run on Sauce Labs
  // Check out https://saucelabs.com/platforms for all browser/OS combos
  const customLaunchers = {
    sl_ie_11: {
      base: 'SauceLabs',
      browserName: 'Internet Explorer',
      platform: 'Windows 8.1',
      version: '11'
    }
  };

  const sauceLabs = {
    testName: 'availity-workflow-angular',
    startConnect: true,
    recordScreenshots: false,
    singleRun: true,
    recordVideo: false,
    transports: ['xhr-polling']
  };

  if (process.env.TRAVIS_JOB_NUMBER) {
    sauceLabs.startConnect = false;
    sauceLabs.build = `TRAVIS #${process.env.TRAVIS_BUILD_NUMBER} (${process.env.TRAVIS_BUILD_ID})`;
    sauceLabs.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;
    sauceLabs.tags = [process.env.TRAVIS_BRANCH, process.env.TRAVIS_PULL_REQUEST];
  }

  config.set(
    Object.assign(
      {
        logLevel: config.LOG_DEBUG,
        browsers: Object.keys(customLaunchers),
        customLaunchers,
        sauceLabs
      },
      karmaConfig
    )
  );
};
