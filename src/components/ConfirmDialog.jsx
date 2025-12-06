import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Confirmar",
  cancelText = "Cancelar"
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-neutral-900 text-xl font-bold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-neutral-700 text-base font-medium">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel 
            onClick={onClose}
            className="bg-white border-2 border-neutral-400 text-neutral-900 hover:bg-neutral-100 font-bold">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold">
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}