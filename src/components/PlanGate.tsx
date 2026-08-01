import React from 'react';
import type { PlanLevel } from '../lib/stripe';

interface PlanGateProps {
  requiredPlan: PlanLevel;
  children: React.ReactNode;
}

const PlanGate: React.FC<PlanGateProps> = ({ children }) => <>{children}</>;

export default PlanGate;
