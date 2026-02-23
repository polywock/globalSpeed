import { ErrorBoundary, FallbackProps } from "react-error-boundary"
import { ReactNode } from "react"
import { restoreConfig } from "../utils/state"
import { getDefaultState } from "@/defaults"
import "./ErrorFallback.css"

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
	console.log("ERROR: ", error)

	const handleReset = async () => {
		await chrome.storage.local.clear()
		await restoreConfig(getDefaultState(), false)
		setTimeout(() => {
			window.location.reload()
		}, 50)
	}

	const handleRefresh = () => {
		window.location.reload()
	}

	return (
		<div className="ErrorFallback">
			<div>An error occurred.</div>
			<ol>
				<li>
					Try refreshing this page. <button onClick={handleRefresh}>refresh</button>
				</li>
				<li>
					If that didn't work, click this button to reset the settings. <button onClick={handleReset}>reset</button>
				</li>
				<li>As a final resort, try reinstalling the extension.</li>
			</ol>
		</div>
	)
}

export function ErrorFallback({ children }: { children: ReactNode }) {
	return <ErrorBoundary FallbackComponent={Fallback}>{children}</ErrorBoundary>
}
