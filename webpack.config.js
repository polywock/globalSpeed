const { resolve } = require("path")
const { env } = require("process")
const webpack = require('webpack')

const entry = {
  isolated: "./src/contentScript/isolated/index.ts",
  background: "./src/background/index.ts",
  popup: "./src/popup/popup.tsx",
  options: "./src/options/options.tsx",
  faqs: "./src/faqs/faqs.tsx",
  main: "./src/contentScript/main/index.ts",
  pageDraw: "./src/contentScript/pageDraw/index.ts",
  pane: "./src/contentScript/pane/index.ts",
  placer: "./src/placer/index.ts"
}

if (env.FIREFOX) {
  entry["mainLoader"] = "./src/contentScript/main/loader.ts"
} else {
  entry["sound-touch-processor"] = "./src/offscreen/SoundTouchProcessor.ts"
  entry["reverse-sound-processor"] = "./src/offscreen/ReverseProcessor.ts"
  entry["offscreen"] = "./src/offscreen/index.ts"
}



const common = {
  entry,
  output: {
    path: resolve(__dirname, env.FIREFOX ? "buildFf" : "build", "unpacked"),
    chunkFilename: "chunks/[name].js"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        sideEffects: true,
        test: /\.css$/,
        exclude: /node_modules/,
        resourceQuery: { not: [/raw/] },
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              url: false,
              importLoaders: 1
            }
          },
          "postcss-loader"
        ],
      },
      {
        test: /\.css$/,
        resourceQuery: /raw/,
        exclude: [/node_modules/],
        type: 'asset/source',
        use: [
          "postcss-loader"
        ]
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", '.js'],
    alias: {
      "@": resolve(__dirname, "src"),
      notFirefox: env.FIREFOX ? false : resolve(__dirname, "src"),
      isFirefox: env.FIREFOX ? resolve(__dirname, "src") : false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      gvar: [resolve(__dirname, "src", "globalVar.ts"), 'gvar']
    })
  ]
}

if (env.NODE_ENV === "production") {
  module.exports = {
    ...common,
    mode: "production"
  }
} else {
  module.exports = {
    ...common,
    mode: "development",
    devtool: false
  }
}