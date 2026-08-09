import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ConnectivityLegend, RISK_CLASS_META } from '@/src/components/ConnectivityLegend';

/**
 * Section 3: the mobile UI must render exactly these three canonical
 * classes/labels and must always disclose that a class is a planning
 * prediction, not confirmed coverage.
 */
describe('ConnectivityLegend', () => {
  it('renders all three canonical risk-class labels', () => {
    render(<ConnectivityLegend />);
    expect(screen.getByText('Likely covered')).toBeTruthy();
    expect(screen.getByText('Uncertain')).toBeTruthy();
    expect(screen.getByText('Predicted gap')).toBeTruthy();
  });

  it('discloses the planning-prediction disclaimer required by Section 3', () => {
    render(<ConnectivityLegend />);
    expect(screen.getByText('Planning prediction, not confirmed coverage.')).toBeTruthy();
  });

  it('never renders language Section 3 explicitly forbids', () => {
    render(<ConnectivityLegend />);
    const forbidden = ['confirmed dead zone', 'no signal', 'guaranteed coverage', 'exact coverage'];
    for (const phrase of forbidden) {
      expect(screen.queryByText(new RegExp(phrase, 'i'))).toBeNull();
    }
  });

  it('exposes the same three risk classes RISK_CLASS_META defines, in order', () => {
    expect(Object.keys(RISK_CLASS_META)).toEqual(['likely_covered', 'uncertain', 'predicted_gap']);
  });
});
