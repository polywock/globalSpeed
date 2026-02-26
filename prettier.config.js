/** @type {import('prettier').Config} */
const config = {
	semi: false,
	singleQuote: false,
	trailingComma: "all",
	printWidth: 150,
	tabWidth: 3,
	useTabs: true,
	quoteProps: "as-needed",
	bracketSpacing: true,
	arrowParens: "always",
	plugins: ["@ianvs/prettier-plugin-sort-imports"],
	importOrder: ["<BUILTIN_MODULES>", "<THIRD_PARTY_MODULES>", "^@/(.*)$", "^firefox/(.*)$", "^notFirefox/(.*)$", "^[./].*(?<!\\.css)$", "\\.css$"],
}

export default config
