
import { ReactNode } from 'react';

export type StepType = 'upload' | 'edit' | 'generate' | 'wordpress-upload';

export interface Step {
  title: string;
  description: string;
  component: ReactNode;
}

export interface Steps {
  [key: string]: Step;
}
