
// Test to make sure all locales have the required strings.

const { readFileSync } = require("fs")
const { exit } = require("process")

const locales = ["en", "it", "es", "hi", "ja", "ko", "pt_BR", "ru", "tr", "zh_CN", "zh_TW"]

let targetLeaves;

for (let locale of locales) {
  let leaves; 
  try {
    leaves = getLeafs(JSON.parse(readFileSync(`./static/locales/${locale}.json`, {encoding: "utf8"})))
  } catch (err) {
    console.log("Could not parse", locale, leaves)
    exit()
  }

  if (!targetLeaves) {
    targetLeaves = leaves;
    continue 
  }

  const omitted = targetLeaves.filter(v => !leaves.includes(v))
  const extra = leaves.filter(v => !targetLeaves.includes(v))

  if (omitted.length) {
    console.log("OMITTED", "\n=========")
    omitted.forEach(v => console.log(v))
  }

  if (extra.length) {
    console.log("EXTRA", "\n=========")
    extra.forEach(v => console.log(v))
  }

  if (omitted.length + extra.length ) {
    console.log("FIX", locale)
    exit()
  }
}

console.log("ALL GOOD!")

function getLeafs(obj, ctx = []) {
  const leafs = []
  for (let [k, v] of Object.entries(obj)) {
    if (typeof v === "object") {
      leafs.push(...getLeafs(v, [...ctx, k]))
    } else {
      leafs.push([...ctx, k].join('.'))
    }
  }
  return leafs
}
