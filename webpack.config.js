const { resolve } = require("path")
const { env } = require("process")

const entry = {
  contentScript: "./src/contentScript/index.ts",
  background: "./src/background/index.ts",
  popup: "./src/popup/popup.tsx",
  options: "./src/options/options.tsx",
  faqs: "./src/faqs/faqs.tsx",
  ctx: "./src/contentScript/ctx.ts"
}

if (!env.FIREFOX) {
  entry["sound-touch-processor"] = "./src/background/SoundTouchProcessor.ts"
  entry["reverse-sound-processor"] = "./src/background/ReverseProcessor.ts"
} 

const common = {
  entry,
  output: {
    path: resolve(__dirname, env.FIREFOX ? "buildFf": "build", "unpacked")
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
            "style-loader", 
            {
              loader: "css-loader",
              options: {
                url: false
              }
            },
            "sass-loader"
        ]
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", '.js'],
    alias: {
      notFirefox: env.FIREFOX ? false : resolve(__dirname, "src"),
      isFirefox: env.FIREFOX ? resolve(__dirname, "src") : false 
    }
  }
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
    // devtool: "eval-source-map" // requires manifest to be loosened into "content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'"
  }
}