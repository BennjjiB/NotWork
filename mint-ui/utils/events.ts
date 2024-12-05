import {createEvent} from "react-event-hook"

export const {useOpenDialogListener, emitOpenDialog} = createEvent("openDialog")<boolean>()