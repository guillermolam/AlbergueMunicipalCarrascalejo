import { Toaster as ToasterPrimitive } from "react-hot-toast"

export const Toaster = () => {
  return (
    <ToasterPrimitive
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
        },
      }}
    />
  )
}