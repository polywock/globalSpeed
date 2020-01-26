const { resolve } = require("path")

module.exports = {
  entry: {
    contentScript: "./src/contentScript/contentScript.ts",
    background: "./src/background.ts",
    popup: "./src/popup/popup.tsx",
    options: "./src/options/options.tsx"
  },
  output: {
    path: resolve(__dirname, "build", "unpacked")
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: "babel-loader"
      },
      {
        test: /\.scss$/,
        use: [
            "style-loader", // creates style nodes from JS strings
            "css-loader", // translates CSS into CommonJS
            "sass-loader" // compiles Sass to CSS, using Node Sass by default
        ]
      }
    ]
  },
  resolve: {
    extensions: [ '.ts', '.js', '.tsx']
  },
  devtool: false
}