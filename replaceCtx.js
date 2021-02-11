// Must be done after Webpack builds the ctx.js and contentScript.js file. 
// Replaces $$$CTX$$$ placeholder within contentScript.js to ctx.js code.

const { readFileSync, writeFileSync } = require("fs")
const { env } = require("process")

const unpackedRoot = `${env.FIREFOX ? "buildFf" : "build"}/unpacked`

let csPath = `${unpackedRoot}/contentScript.js`


let cs = readFileSync(csPath, {encoding: "utf8"})
let ctx = readFileSync(`${unpackedRoot}/ctx.js`, {encoding: "utf8"})

let placeholderCount = 0

// In loop, since if webpack is being built for development their may be multiple copies. 
// In production mode, only 1 copy should remain. 
while (true) {
  if (cs.indexOf("$$$CTX$$$") === -1) {
    if (!placeholderCount) {
      throw Error("This shouldn't happen. Could not find $$$CTX$$$ placeholder.")
    }
    break 
  }
  cs = cs.replace("$$$CTX$$$", JSON.stringify(ctx).slice(1, -1))
  placeholderCount++
}

writeFileSync(csPath, cs, {encoding: "utf8", flags: "w+"})
console.log(`REPLACED $$$CTX$$$ PLACEHOLDER (${placeholderCount})`)