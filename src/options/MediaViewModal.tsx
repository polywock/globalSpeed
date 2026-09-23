import { ModalBase, ModalContent } from "@/comps/ModalBase"
import { Toggle } from "@/comps/Toggle"
import { gvar } from "@/globalVar"
import { useStateView } from "@/hooks/useStateView"
import { OptionField } from "./OptionField"

export function MediaViewModal(props: { onClose: () => void }) {
	const [view, setView] = useStateView({ showSeekBar: true })
	if (!view) return null

	return (
		<ModalBase keepOnWheel={true} onClose={props.onClose}>
			<ModalContent size="md">
				<OptionField>
					<span>{gvar.gsm.options.flags.showSeekBar}</span>
					<Toggle
						aria-label={gvar.gsm.options.flags.showSeekBar}
						value={!!view.showSeekBar}
						onChange={(showSeekBar) => setView({ showSeekBar })}
					/>
				</OptionField>
			</ModalContent>
		</ModalBase>
	)
}
