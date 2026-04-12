import { toast as hotToast } from "react-hot-toast"

export const toast = {
  success: (message: string) => hotToast.success(message, { duration: 3000 }),
  error: (message: string) => hotToast.error(message, { duration: 6000 }),
  loading: (message: string, id?: string) => hotToast.loading(message, { id }),
  dismiss: (id?: string) => hotToast.dismiss(id),
}

export default toast
