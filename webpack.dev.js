const common = require("./webpack.common.js")

module.exports = {
  ...common,
  mode: "development",
  devtool: "eval-source-map" // false
}