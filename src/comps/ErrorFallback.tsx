import { ReactNode } from "react"
import { ErrorBoundary, FallbackProps } from "react-error-boundary"
import { getDefaultState } from "@/defaults"
import { restoreConfig } from "../utils/state"

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
		<div className="ErrorFallback mt-15 border-[3px] border-solid border-destructive bg-background p-[10px] text-[1.1em]">
			<div>An error occurred.</div>
			<ol>
				<li className="mb-[15px] last:mb-0">
					Try refreshing this page.{" "}
					<button className="mt-[5px] block" onClick={handleRefresh}>
						refresh
					</button>
				</li>
				<li className="mb-[15px] last:mb-0">
					If that didn't work, click this button to reset the settings.{" "}
					<button className="mt-[5px] block" onClick={handleReset}>
						reset
					</button>
				</li>
				<li className="mb-[15px] last:mb-0">As a final resort, try reinstalling the extension.</li>
			</ol>
		</div>
	)
}

export function ErrorFallback({ children }: { children: ReactNode }) {
	return <ErrorBoundary FallbackComponent={Fallback}>{children}</ErrorBoundary>
}
