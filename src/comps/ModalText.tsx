import { useState } from "react"
import { gvar } from "@/globalVar"
import { GearIcon } from "./GearIcon"
import { ModalBase } from "./ModalBase"
import { ThrottledTextInput } from "./ThrottledTextInput"

type ModalTextProps = {
	value: string
	onChange: (newValue: string) => void
	label?: string
}

export function ModalText(props: ModalTextProps) {
	const [modal, setModal] = useState(false)

	return (
		<div>
			<GearIcon tooltip={gvar.gsm.token.edit} onClick={(e) => setModal(!modal)} />
			{modal && (
				<ModalBase
					keepOnWheel={true}
					onClose={() => {
						setModal(false)
					}}
				>
					<ThrottledTextInput
						textArea={true}
						passTextArea={{
							className: "h-[75vh] w-[50vw] rounded-2xl p-5 mobile:h-3/4 mobile:w-1/2",
						}}
						value={props.value}
						onChange={(v) => {
							props.onChange(v)
						}}
					/>
				</ModalBase>
			)}
		</div>
	)
}
