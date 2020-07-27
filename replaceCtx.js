const { readFileSync, writeFileSync } = require("fs")
const { env } = require("process")

const unpackedRoot = `${env.FIREFOX ? "buildFf" : "build"}/unpacked`

let csPath = `${unpackedRoot}/contentScript.js`


let cs = readFileSync(csPath, {encoding: "utf8"})
let ctx = readFileSync(`${unpackedRoot}/ctx.js`, {encoding: "utf8"})

cs = cs.replace("$$$CTX$$$", JSON.stringify(ctx).slice(1, -1))

writeFileSync(csPath, cs, {encoding: "utf8", flags: "w+"})