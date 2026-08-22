import { MousePointer } from "lucide-react"
import { Tooltip } from "@/comps/Tooltip"
import { Button } from "@/comps/ui/button"
import { commandInfos, CommandName } from "@/defaults/commands"
import { FilterName } from "@/defaults/filters"
import { gvar } from "@/globalVar"
import { AdjustMode, ItcInit, Keybind, TargetFx } from "@/types"
import { sendMessageToConfigSync } from "@/utils/configUtils"
import { cn } from "@/utils/helper"

type InsertItcButtonProps = {
	command: CommandName
	filterOption?: FilterName
	filterTarget?: TargetFx
	className?: string
}

/** Puts a slider for one value onto the page, or takes it back off if it's already there. */
export function InsertItcButton({ command, filterOption, filterTarget, className }: InsertItcButtonProps) {
	const label = gvar.gsm.options.editor.adjustModes[AdjustMode.ITC]

	return (
		<Tooltip title={label}>
			<Button
				size="control"
				variant="ghost"
				aria-label={label}
				className={cn("px-0 py-0 align-middle text-secondary-foreground opacity-75 hover:opacity-100", className)}
				onClick={() => insertItcRow(command, filterOption, filterTarget)}
			>
				<MousePointer className="size-5" />
			</Button>
		</Tooltip>
	)
}

async function insertItcRow(command: CommandName, filterOption?: FilterName, filterTarget?: TargetFx) {
	const kb = {
		...commandInfos[command].generate(),
		// Stable, so pressing the button again removes the row it added.
		id: ["popup", command, filterTarget, filterOption].filter(Boolean).join(":"),
		adjustMode: AdjustMode.ITC,
		...(filterOption ? { filterOption } : null),
		...(filterTarget ? { filterTarget } : null),
	} as Keybind

	const init = (await chrome.runtime.sendMessage({ type: "REQUEST_ITC_INIT", kb } as Messages)) as ItcInit
	init && sendMessageToConfigSync({ type: "ITC", inits: [init] }, gvar.tabInfo.tabId, 0)
}
