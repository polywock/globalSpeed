
import { Rect } from "../types";
import { loadGsm } from "../utils/gsm";
import "./styles.css"

let id = new URL(location.href).searchParams.get('id')
if (!id) window.close() 

loadGsm().then(gsm => {
    gvar.gsm = gsm 

    document.documentElement.setAttribute("lang", gvar.gsm._lang)
    if (gvar.gsm) main()
})

let bounds: Rect = {left: screenLeft, top: screenTop, width: outerWidth, height: outerHeight}
let leftDiv = document.querySelector(".left")
let topDiv = document.querySelector(".top")
let widthDiv = document.querySelector(".width")
let heightDiv = document.querySelector(".height")


let applyButton = document.querySelector("#apply")
let resetButton = document.querySelector("#reset")

applyButton.addEventListener("click", async e => {
    if (bounds) {
        const keybinds = (await chrome.storage.local.get('g:keybinds'))['g:keybinds']
        const kb = keybinds.find((kb: any) => kb.id === id)
        if (kb) {
            kb.valuePopupRect = bounds 
            chrome.storage.local.set({'g:keybinds': keybinds})
        }
    }
    window.close()
})

resetButton.addEventListener("click", e => {
    window.close()
})


function main() {
    document.querySelector("#intro").textContent = gvar.gsm.placer.windowPrompt
    leftDiv.children[0].textContent = gvar.gsm.placer.windowBounds.left
    topDiv.children[0].textContent = gvar.gsm.placer.windowBounds.top
    widthDiv.children[0].textContent = gvar.gsm.placer.windowBounds.width
    heightDiv.children[0].textContent = gvar.gsm.placer.windowBounds.height

    applyButton.textContent = gvar.gsm.placer.apply
    resetButton.textContent = gvar.gsm.placer.cancel
    sync() 
    setInterval(onInterval, 300)
}

function onInterval() {
    let alt = {left: screenLeft, top: screenTop, width: outerWidth, height: outerHeight}
    if (bounds.left !== alt.left || bounds.top !== alt.top || bounds.width !== alt.width || bounds.height !== alt.height) {
        bounds = alt 
        sync() 
    }
}

function sync() {
    leftDiv.children[1].textContent = `${bounds.left}px`
    topDiv.children[1].textContent = `${bounds.top}px`
    widthDiv.children[1].textContent = `${bounds.width}px`
    heightDiv.children[1].textContent = `${bounds.height}px`
    
}