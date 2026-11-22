import { createContext, useContext } from "react"

/** Id of the visible label for the controls inside, so screen readers announce what each control is for. */
export const FieldLabelContext = createContext<string | undefined>(undefined)

type LabelProps = { "aria-label"?: string; "aria-labelledby"?: string }

/** Labels a control by the surrounding field's label, unless it is already labelled. */
export function useFieldLabelProps(props: LabelProps): LabelProps {
	const labelId = useContext(FieldLabelContext)
	if (!labelId || props["aria-label"] || props["aria-labelledby"]) return {}
	return { "aria-labelledby": labelId }
}
