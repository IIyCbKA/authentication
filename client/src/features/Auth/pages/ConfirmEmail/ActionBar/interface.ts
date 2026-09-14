import React from "react";
import type { ProcessingButton } from "@/features/Auth/pages/ConfirmEmail/types.ts";

export interface ActionBarProps {
  isProcessing: ProcessingButton | null;
  setProcessing: React.Dispatch<React.SetStateAction<ProcessingButton | null>>;
}
