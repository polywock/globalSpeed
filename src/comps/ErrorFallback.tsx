import { Component, ReactElement } from "react"
import { pushView } from "../background/GlobalState"
import "./ErrorFallback.scss"

export class ErrorFallback extends Component<{children: ReactElement}, {hasError: boolean}> {
  state = {hasError: false}
  componentDidCatch() {
    this.setState({hasError: true})
    return 
  }
  handleReset = () => {
    pushView({override: {}, tabId: gvar.tabInfo?.tabId, overDefault: true})
    setTimeout(() => {
      window.location.reload()
    }, 50)
  }
  handleRefresh = () => {
    window.location.reload()
  }
  render() {
    if (this.state.hasError) {
      return <div className="ErrorFallback">
        <div>An error occurred.</div>
        <ol>
          <li>Try refreshing this page.  <button onClick={this.handleRefresh}>refresh</button></li>
          <li>If that didn't work, click this button to reset the settings. <button onClick={this.handleReset}>reset</button></li>
          <li>As a final resort, try reinstalling the extension.</li>
        </ol>
      </div>
    }
    return this.props.children
  }
}