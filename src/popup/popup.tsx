import "regenerator-runtime/runtime"
import React from "react"
import ReactDOM from "react-dom"
import { App } from "./App"
import { ensureGsmLoaded } from "../utils/i18"

ensureGsmLoaded().then(() => {
  ReactDOM.render(<App/>, document.querySelector("#root"))
})


