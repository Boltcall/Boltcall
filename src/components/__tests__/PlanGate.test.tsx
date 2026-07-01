import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlanGate from '../PlanGate';

describe('PlanGate', () => {
  it('renders children without showing a locked upgrade screen', () => {
    render(
      <PlanGate requiredPlan="pro">
        <div>Feature content</div>
      </PlanGate>,
    );

    expect(screen.getByText('Feature content')).toBeInTheDocument();
    expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument();
  });
});
