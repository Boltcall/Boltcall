import { Component as BgGradient } from '../ui/bg-gredient';

export function SetupGradientBackground() {
  return (
    <BgGradient
      gradientFrom="#f8fbff"
      gradientTo="#2f6bff"
      gradientSize="125% 125%"
      gradientPosition="50% 10%"
      gradientStop="40%"
    />
  );
}
