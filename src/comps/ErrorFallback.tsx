import { ReactNode } from "react"
import { ErrorBoundary, FallbackProps } from "react-error-boundary"
import { getDefaultState } from "@/defaults"
import { gvar } from "@/globalVar"
import { restoreConfig } from "../utils/state"
import { Button } from "./ui/button"

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
	console.log("ERROR: ", error)
	const copy = gvar.gsm?.errorFallback

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
		<div className="mt-15 rounded-lg border-[3px] border-destructive bg-background p-4 text-lg">
			<div>{copy?.title || "Something went wrong."}</div>
			<ol>
				<li className="mb-3.75 last:mb-0">
					{copy?.refreshInstruction || "Refresh this page and try again."}
					<Button className="mt-1.25 block" onClick={handleRefresh}>
						{copy?.refreshAction || "Refresh page"}
					</Button>
				</li>
				<li className="mb-3.75 last:mb-0">
					{copy?.resetInstruction || "If the issue continues, reset all extension settings to their defaults."}
					<Button className="mt-1.25 block" onClick={handleReset}>
						{copy?.resetAction || "Reset settings"}
					</Button>
				</li>
				<li className="mb-3.75 last:mb-0">{copy?.reinstallInstruction || "As a last resort, reinstall the extension."}</li>
			</ol>
		</div>
	)
}

export function ErrorFallback({ children }: { children: ReactNode }) {
	return <ErrorBoundary FallbackComponent={Fallback}>{children}</ErrorBoundary>
}
