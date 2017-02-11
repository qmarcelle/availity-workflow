// https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/utils/createJestConfig.js
const jest = require('jest');
const settings = require('availity-workflow-settings');

// Generates a configuration file for jest to consume from the CLI command.
// The configuration file stubs out
function create() {

  const rootDir = settings.project();

  // TODO: I don't know if it's safe or not to just use / as path separator
  // in Jest configs. We need help from somebody with Windows to determine this.
  const config = {
    collectCoverageFrom: [`${settings.app()}/**/*.{js,jsx}`],
    // setupFiles: [resolve('config/polyfills.js')],
    // setupTestFrameworkScriptFile: setupTestsFile,
    testPathIgnorePatterns: [
      '<rootDir>[/\\\\](build|docs|node_modules|scripts)[/\\\\]'
    ],
    testEnvironment: 'node',
    testURL: 'http://localhost',
    transform: {
      '^.+\\.(js|jsx)$': `${require.resolve('./jest/babel.js')}`,
      '^.+\\.css$': `${require.resolve('./jest/css.js')}`,
      '^(?!.*\\.(js|jsx|css|json)$)': `${require.resolve('./jest/file.js')}`

    },
    transformIgnorePatterns: [
      '[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$'
    ]
  };

  if (rootDir) {
    config.rootDir = rootDir;
  }

  return config;

}

function test() {

  const argv = process.argv.slice(2);
  const jestConfig = JSON.stringify(create());
  argv.push(`--config=${jestConfig}`);
  argv.push('--env=jsdom');

  jest.run(argv);

}

module.exports = test;