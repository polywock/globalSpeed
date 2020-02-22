const common = require("./webpack.common.js")

module.exports = {
  ...common,
  mode: "development",
  devtool: false // "eval-source-map" requires "content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'"
}