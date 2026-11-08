import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'

export const handleServerError = (error: unknown) => {
  let errMsg = getApiErrorMessage(error)

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'Content not found.'
  }

  toast.error(errMsg)
}
