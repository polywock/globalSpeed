function main() {
	if ((globalThis as any).robert) return
	;(globalThis as any).robert = true
	const s = document.createElement("script")
	s.type = "text/javascript"
	s.text = "$$$CTX$$$"
	try {
		document.documentElement.appendChild(s)
		s.remove()
	} catch (err) {}
	mainAlt()
}

function mainAlt() {
	const s = document.createElement("script")
	s.type = "text/javascript"
	s.async = true
	s.src = chrome.runtime.getURL("main.js")
	document.documentElement.appendChild(s)
	s.remove()
}

main()
