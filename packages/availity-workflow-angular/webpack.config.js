const path = require('path');
const webpack = require('webpack');
const settings = require('availity-workflow-settings');
const exists = require('exists-sync');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackNotifierPlugin = require('webpack-notifier');
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const ruleFonts = require('availity-workflow-settings/webpack/rule-fonts');
const loaderPostcss = require('availity-workflow-settings/webpack/loader-postcss');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const requireRelative = require('require-relative');

const htmlConfig = require('./html');
const VersionPlugin = require('./version');

const babelrcPath = path.join(settings.project(), '.babelrc');
const babelrcExists = exists(babelrcPath);

const config = {
  context: settings.app(),

  entry: {
    index: ['./index.js']
  },

  output: {
    path: settings.output(),
    filename: settings.fileName()
  },

  devtool: settings.sourceMap(),

  resolve: {
    // Tell webpack what directories should be searched when resolving modules
    modules: [settings.app(), path.join(settings.project(), 'node_modules'), path.join(__dirname, 'node_modules')],

    alias: {
      app: path.resolve(settings.app(), 'app-module')
    },

    symlinks: true,
    extensions: ['.js', '.jsx', '.json', '.css', 'less', 'scss']
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
        test: /\.js$/,
        include: settings.include(),
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [require.resolve('availity-workflow-babel-preset-angular')],
              cacheDirectory: settings.isDevelopment(),
              babelrc: babelrcExists
            }
          }
        ]
      },
      {
        test: /\.htm$/,
        use: 'html-loader',
        // Ignore following templates else errors like:
        //    - "window is not defined" error from the html-webpack-plugin
        //    - "The path for file doesn't contains relativeTo param"  from ngtemplate-loader
        exclude: /index\.html/
      },
      {
        test: /\.html$/,
        use: [`ngtemplate-loader?relativeTo=${process.cwd()}/`, 'html-loader'],
        // Ignore following templates else errors like:
        //    - "window is not defined" error from the html-webpack-plugin
        //    - "The path for file doesn't contains relativeTo param"  from ngtemplate-loader
        exclude: /index\.html/
      },
      {
        test: requireRelative.resolve('angular', settings.project()),
        use: ['expose-loader?angular', 'exports-loader?angular']
      },
      {
        test: requireRelative.resolve('jquery', settings.project()),
        use: ['expose-loader?$', 'expose-loader?jQuery']
      },
      {
        test: requireRelative.resolve('lodash', settings.project()),
        use: ['expose-loader?_']
      },
      {
        test: requireRelative.resolve('moment', settings.project()),
        use: ['expose-loader?moment']
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          loaderPostcss,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              importLoaders: 1,
              name: 'images/[name].[ext]'
            }
          }
        ]
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              importLoaders: 1,
              name: 'images/[name].[ext]'
            }
          },
          {
            loader: 'less-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              importLoaders: 1,
              name: 'images/[name].[ext]'
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

    new webpack.ProvidePlugin({
      'window.jQuery': 'jquery',
      $: 'jquery',
      jQuery: 'jquery'
    }),

    new VersionPlugin({
      version: JSON.stringify(settings.version())
    }),

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
