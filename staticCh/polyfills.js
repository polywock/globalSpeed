/*! fromentries. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
// This file is required for the extension to work on Kiwi browser.
// Based on work from https://github.com/feross/fromentries/blob/master/index.js
Object.prototype.fromEntries || Object.defineProperty(Object.prototype, "fromEntries", { configurable: !0, value: function(iterable) { return [...iterable].reduce((obj, [key, val]) => { obj[key] = val; return obj; }, {})}, writable: !0});