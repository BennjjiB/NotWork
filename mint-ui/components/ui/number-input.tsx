import {NumberInput as ChakraNumberInput} from "@chakra-ui/react"
import {forwardRef} from "react"

export interface NumberInputProps extends ChakraNumberInput.RootProps {
}

export const NumberInputRoot = forwardRef<HTMLDivElement, NumberInputProps>(
  function NumberInput(props, ref) {
    const {children, ...rest} = props
    const prop = {
      color: "white",
      _hover: {backgroundColor: "transparent"}
    }
    return (
      <ChakraNumberInput.Root ref={ref} variant="outline" {...rest}>
        {children}
        <ChakraNumberInput.Control>
          <ChakraNumberInput.IncrementTrigger {...prop}/>
          <ChakraNumberInput.DecrementTrigger {...prop}/>
        </ChakraNumberInput.Control>
      </ChakraNumberInput.Root>
    )
  },
)

export const NumberInputField = ChakraNumberInput.Input
