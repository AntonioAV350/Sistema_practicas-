import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { mensajeError } from '../utils/errores';

// Atajos para toasts y diálogos de confirmación
export function useAviso() {
  const toast = useToast();
  const confirm = useConfirm();

  const exito = (detail, summary = 'Listo') => toast.add({ severity: 'success', summary, detail, life: 3500 });
  const error = (e, summary = 'Error') =>
    toast.add({ severity: 'error', summary, detail: typeof e === 'string' ? e : mensajeError(e), life: 6000 });

  // confirmar({ mensaje, titulo, aceptar, peligro }) -> Promise<boolean>
  const confirmar = ({ mensaje, titulo = 'Confirmar', aceptar = 'Sí, continuar', peligro = false }) =>
    new Promise((resolve) => {
      let resuelto = false;
      const fin = (v) => {
        if (!resuelto) {
          resuelto = true;
          resolve(v);
        }
      };
      confirm.require({
        header: titulo,
        message: mensaje,
        icon: peligro ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
        acceptProps: { label: aceptar, severity: peligro ? 'danger' : undefined },
        rejectProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
        accept: () => fin(true),
        reject: () => fin(false),
        onHide: () => fin(false),
      });
    });

  return { exito, error, confirmar };
}
