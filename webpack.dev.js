const common = require("./webpack.common.js")

module.exports = {
  ...common,
  mode: "development",
  devtool: false  // "eval-source-map"
}