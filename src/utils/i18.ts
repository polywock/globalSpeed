import { SetState } from "../types";

export const SetStateMap: {
  [key in SetState]: string
} = {
  "on": chrome.i18n.getMessage("token__on"),
  "off": chrome.i18n.getMessage("token__off"),
  "toggle": chrome.i18n.getMessage("token__toggle"),
}
