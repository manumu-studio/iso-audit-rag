// Feature card model for the landing feature grid.

export interface Feature {
  title: string;
  description: string;
  icon: string;
}

export interface FeatureShowcaseProps {
  readonly className?: string | undefined;
}
