const path = require('path');
const webpack = require('webpack');
const settings = require('availity-workflow-settings');
const exists = require('exists-sync');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackNotifierPlugin = require('webpack-notifier');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const loaderPostcss = require('availity-workflow-settings/webpack/loader-postcss');
const ruleFonts = require('availity-workflow-settings/webpack/rule-fonts');

process.noDeprecation = true;

const htmlConfig = require('./html');
const VersionPlugin = require('./version');

const babelrcPath = path.join(settings.project(), '.babelrc');
const babelrcExists = exists(babelrcPath);

const indexHotLoader = [
  'react-hot-loader/patch', // Patches React.createElement in dev
  `webpack-dev-server/client?http://${settings.host()}:${settings.port()}`, // Enables websocket for updates
  'webpack/hot/only-dev-server', // performs HMR in browser
  './index.js'
];

const indexHot = [
  `webpack-dev-server/client?http://${settings.host()}:${settings.port()}`, // Enables websocket for updates
  'webpack/hot/only-dev-server', // performs HMR in brwoser
  './index.js'
];

const index = settings.isHotLoader() ? indexHotLoader : indexHot;

const config = {
  context: settings.app(),

  entry: {
    index
  },

  output: {
    path: settings.output(),
    filename: settings.fileName()
  },

  devtool: settings.sourceMap(),

  resolve: {
    // Tell webpack what directories should be searched when resolving modules
    modules: [settings.app(), path.join(settings.project(), 'node_modules'), path.join(__dirname, 'node_modules')],
    symlinks: true,
    extensions: ['.js', '.jsx', '.json', '.css', 'scss']
  },

  // This set of options is identical to the resolve property set above,
  // but is used only to resolve webpack's loader packages.
  resolveLoader: {
    modules: [path.join(settings.project(), 'node_modules'), path.join(__dirname, 'node_modules')],
    symlinks: true
  },

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        include: settings.include(),
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [require.resolve('availity-workflow-babel-preset')],
              cacheDirectory: settings.isDevelopment(),
              babelrc: babelrcExists,
              plugins: [babelrcExists ? null : require.resolve('react-hot-loader/babel')]
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { sourceMap: true }
          },
          loaderPostcss
        ]
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          },
          loaderPostcss,
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      ruleFonts,
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: ['url-loader?name=images/[name].[ext]&limit=10000']
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin(settings.globals()),

    new VersionPlugin({
      version: JSON.stringify(settings.version())
    }),

    // Converts:
    //    [HMR] Updated modules:
    //    [HMR]  - 5
    // To:
    //    [HMR] Updated modules:
    //    [HMR]  - ./src/middleware/api.js
    new webpack.NamedModulesPlugin(),

    // Generate hot module chunks
    new webpack.HotModuleReplacementPlugin(),

    new HtmlWebpackPlugin(htmlConfig),

    new DuplicatePackageCheckerPlugin({
      verbose: true
    }),

    // Ignore all the moment local files
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

    new CaseSensitivePathsPlugin(),

    new CopyWebpackPlugin(
      [
        {
          context: `${settings.project()}/project/static`, // copy from this directory
          from: '**/*', // copy all files
          to: 'static' // copy into {output}/static folder
        }
      ],
      {
        debug: 'warning'
      }
    )
  ]
};

if (settings.isNotifications()) {
  config.plugins.push(
    new WebpackNotifierPlugin({
      contentImage: path.join(__dirname, 'availity.png'),
      excludeWarnings: true
    })
  );
}

module.exports = config;
