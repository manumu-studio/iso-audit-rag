// Step model for the landing “How it works” pipeline section.

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface HowItWorksProps {
  readonly className?: string | undefined;
}
