/* eslint global-require:0 import/no-dynamic-require: 0 */
const path = require('path');
const Logger = require('availity-workflow-logger');
const exists = require('exists-sync');
const trimStart = require('lodash.trimstart');
const chalk = require('chalk');
const merge = require('lodash.merge');
const fs = require('fs');
const yaml = require('js-yaml');
const get = require('lodash.get');
const { argv } = require('yargs');
const each = require('lodash.foreach');
const isString = require('lodash.isstring');
const isFunction = require('lodash.isfunction');
const isObject = require('lodash.isobject');

function stringify(obj) {
  each(obj, (value, key) => {
    if (isString(value)) {
      try {
        JSON.parse(value);
        obj[key] = value;
      } catch (e) {
        obj[key] = JSON.stringify(value);
      }
    } else if (isObject(value) && !isFunction(value)) {
      stringify(value);
    }
  });
  return obj;
}

const settings = {
  // Cache these values
  configuration: null,
  workflowConfigPath: null,

  app() {
    return path.join(this.project(), 'project/app');
  },

  include() {
    return [this.app(), /node_modules[\\/](?=@availity).*/];
  },

  // https://webpack.js.org/configuration/devtool/
  sourceMap() {
    // Get sourcemap from command line or developer config else "source-map"
    const sourceMap = get(this.configuration, 'development.sourceMap', 'source-map');

    return this.isDistribution() || this.isDryRun() ? 'source-map' : sourceMap;
  },

  coverage() {
    return get(this.configuration, 'development.coverage', path.join(this.project(), 'coverage'));
  },

  css() {
    return this.isDistribution() ? '[name]-[chunkhash].css' : '[name].css';
  },

  // Returns the JSON object from contents or the JSON object from
  // the project root
  pkg(contents) {
    if (contents) {
      return JSON.parse(contents || this.raw());
    }

    return require(path.join(this.project(), 'package.json'));
  },

  // Don’t use [chunkhash] in development since this will increase compilation time
  // In production, [chunkhash] generate hashes depending on the file contents this if
  // the contents don't change the file could potentially be cached in the browser.
  fileName() {
    return this.isDistribution() ? '[name]-[chunkhash].js' : '[name].js';
  },

  output() {
    return this.isDistribution() ? path.join(this.project(), 'dist') : path.join(this.project(), 'build');
  },

  port() {
    return get(this.configuration, 'development.port', 3000);
  },

  host() {
    return get(this.configuration, 'development.host', '0.0.0.0');
  },

  open() {
    return get(this.configuration, 'development.open');
  },

  targets() {
    const defaultTargets = {
      ie: 9,
      uglify: true
    };

    const developmentTarget = get(this.configuration, 'development.targets', defaultTargets);

    return this.isDevelopment() ? developmentTarget : defaultTargets;
  },

  globals() {
    const configGlobals = stringify(get(this.configuration, 'globals', {}));

    const env = this.environment();

    // - Read enviroment variables from command line
    // - Filter out variables that have not been declared in workflow config
    // - Apply environment variables to the default config
    // - Map "staging" to "production" for process.env so that React deploys without extra debugging
    //   capabilities
    const parsedGlobals = Object.keys(process.env)
      .filter(key => key in configGlobals)
      .reduce(
        (result, key) => {
          result[key] = JSON.stringify(process.env[key]);
          return result;
        },
        {
          'process.env.NODE_ENV': JSON.stringify(env === 'staging' ? 'production' : env),
          __TEST__: env === 'test',
          __DEV__: env === 'development',
          __PROD__: env === 'production',
          __STAGING__: env === 'staging'
        }
      );

    return merge(configGlobals, parsedGlobals);
  },

  project() {
    return process.cwd();
  },

  version() {
    return this.pkg().version || 'N/A';
  },

  browsers() {
    return this.configuration.testing.browsers;
  },

  title() {
    return get(this.configuration, 'app.title', 'Availity');
  },

  log() {
    let message = `${this.pluginName().toUpperCase()} MODE`;

    Logger.warn(chalk.bold.yellow(message));

    if (!this.isTesting()) {
      message = trimStart(path.relative(process.cwd(), this.workflowConfigPath), 'node_modules/');
      Logger.info(`Using ${chalk.blue(message)}`);
    }
  },

  logLevel() {
    const level = get(this.configuration, 'development.logLevel', 'none');
    return get(argv, 'development.logLevel', level);
  },

  pluginName() {
    return this.pkg()
      .availityWorkflow.plugin.split('availity-workflow-')[1]
      .toLowerCase();
  },

  init() {
    this.configuration = require('./workflow');
    let developerConfig = {};

    const defaultWorkflowConfig = path.join(__dirname, 'workflow.js');
    const jsWorkflowConfig = path.join(settings.project(), 'project/config/workflow.js');
    const ymlWorkflowConfig = path.join(settings.project(), 'project/config/workflow.yml');

    if (exists(jsWorkflowConfig)) {
      // Try workflow.js
      this.workflowConfigPath = jsWorkflowConfig;
      developerConfig = require(this.workflowConfigPath);
    } else if (exists(ymlWorkflowConfig)) {
      // Try workflow.yml
      this.workflowConfigPath = ymlWorkflowConfig;
      developerConfig = yaml.safeLoad(fs.readFileSync(this.workflowConfigPath, 'utf8'));
    } else {
      // fall back to default ./workflow.js
      this.workflowConfigPath = defaultWorkflowConfig;
    }

    // Merge in ./workflow.js defaults with overrides from developer config
    if (typeof developerConfig === 'function') {
      this.configuration = developerConfig(this.configuration);
    } else {
      merge(this.configuration, this.pkg().availityWorkflow, developerConfig);
    }

    // Merge in CLI overrides.  The command line args can pass nested properties like:
    //
    //    start --development.port=3000 --ekko.port=9999
    //
    // Yargs will convert those arguments into an object.  We pluck the only the top level attributes that we
    // are interested in and merge into the default configuration.
    //
    merge(this.configuration, {
      development: argv.development,
      ekko: argv.ekko,
      globals: argv.globals
    });

    this.targets();
    this.globals();
  },

  raw() {
    if (!this.raw) {
      this.raw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
    }

    return this.raw;
  },

  asset(workflowFilePath, projectFilePath) {
    const hasProjectFile = exists(projectFilePath);
    const filePath = hasProjectFile ? projectFilePath : workflowFilePath;

    if (!this.isTesting()) {
      const message = trimStart(path.relative(process.cwd(), filePath), 'node_modules/');
      Logger.info(`Using ${chalk.blue(message)}`);
    }

    return path.relative(this.app(), filePath);
  },

  config() {
    return this.configuration;
  },

  environment() {
    return process.env.NODE_ENV || 'development';
  },

  // Uses globby which defaults to process.cwd() and path.resolve(options.cwd, "/")
  js() {
    let includeGlobs = argv.include;

    const defaultInclude = [`${this.app()}/**/*.js`, `${this.app()}/**/*.jsx`];

    if (!includeGlobs || !Array.isArray(includeGlobs) || includeGlobs.length === 0) {
      includeGlobs = defaultInclude;
    }

    return includeGlobs.concat(includeGlobs);
  },

  isDryRun() {
    return argv.dryRun !== undefined;
  },

  isStaging() {
    return this.environment() === 'staging';
  },

  isIntegration() {
    return this.environment() === 'integration';
  },

  isNotifications() {
    return get(this.configuration, 'development.notification', true);
  },

  isDevelopment() {
    return this.environment() === 'development';
  },

  isTesting() {
    return this.environment() === 'test';
  },

  isIgnoreUntracked() {
    return argv.ignoreGitUntracked !== undefined;
  },

  isWatch() {
    return argv.watch !== undefined;
  },

  isIntegrationTesting() {
    return argv.integration !== undefined;
  },

  isProduction() {
    return argv.production || this.environment() === 'production';
  },

  isDistribution() {
    return this.isProduction() || this.isStaging();
  },

  isCoverage() {
    return argv.coverage !== undefined;
  },

  isFail() {
    return argv.fail !== undefined;
  },

  isProfile() {
    return argv.profile !== undefined;
  },

  historyFallback() {
    return get(this.configuration, 'development.historyFallback', true);
  },

  isLinterDisabled() {
    return argv.disableLinter !== undefined;
  },

  isHotLoader() {
    return get(this.configuration, 'development.hotLoader', true);
  },

  isEkko() {
    return get(this.configuration, 'ekko.enabled', true);
  },

  commitMessage() {
    return argv.message;
  }
};

module.exports = settings;
