import { Check } from "lucide-react"
import { getCustomerOrderState } from "@/lib/order-totals"

export type OrderStatusStepperProps = {
  roundStatus: "closed" | "ready"
  paid: boolean
  collected: boolean
}

export function OrderStatusStepper(props: OrderStatusStepperProps) {
  const { steps } = getCustomerOrderState(props)

  return (
    <ol
      className="grid grid-cols-4 items-start gap-0"
      aria-label="Bestillingsstatus"
    >
      {steps.map((step, index) => (
        <li
          key={step.label}
          className="relative grid justify-items-center gap-2 text-center"
        >
          {index > 0 ? (
            <span
              className={`absolute top-4 right-1/2 w-full -translate-y-1/2 ${steps[index - 1]?.complete ? "border-t-2 border-solid border-white" : "border-t-2 border-dashed border-white"}`}
              aria-hidden="true"
            />
          ) : null}
          <span
            className={`relative z-10 grid size-8 place-items-center rounded-full border-2 border-white ${step.complete ? "bg-white text-emerald-700" : "bg-card text-white"}`}
            aria-hidden="true"
          >
            {step.complete ? <Check className="size-4" /> : null}
          </span>
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">{step.label}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
