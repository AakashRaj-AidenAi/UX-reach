export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}
