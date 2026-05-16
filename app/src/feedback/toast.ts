import { enqueueSnackbar, type OptionsObject } from 'notistack';

function show(message: string, options: OptionsObject) {
  enqueueSnackbar(message, { autoHideDuration: 4000, ...options });
}

export function toastSuccess(message: string) {
  show(message, { variant: 'success' });
}

export function toastError(message: string) {
  show(message, { variant: 'error', autoHideDuration: 6000 });
}

export function toastInfo(message: string) {
  show(message, { variant: 'info' });
}
