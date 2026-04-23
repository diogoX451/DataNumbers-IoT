export interface ModalProps {
    open: boolean;
    message: string;
    type: "danger" | "success" | "warning" | "info";
    title: string;
    button?: () => void;
  }
  