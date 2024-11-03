"use client"

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react"

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
})

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{mdDown: "4"}}>
        {(toast) => (
          <Toast.Root h="60px" width={{md: "sm"}}>
            {toast.type === "loading" ? (
              <Spinner marginLeft="1rem" marginTop="23px" size="sm" color="blue.solid"/>
            ) : (
              <Toast.Indicator marginLeft="1rem" marginTop="23px"/>
            )}
            <Stack marginTop="21px" gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description>{toast.description}</Toast.Description>
              )}
            </Stack>
            {toast.action && (
              <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
            )}
            {toast.meta?.closable && <Toast.CloseTrigger/>}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}
