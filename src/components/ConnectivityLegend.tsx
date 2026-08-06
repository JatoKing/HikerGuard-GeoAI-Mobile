import React from 'react';
import { View, Text } from 'react-native';

import type { RiskClass } from '@/src/domain/connectivity';

/**
 * Canonical colour + label per risk class (handoff contract Section 3).
 * Every screen that renders `risk_class` should use this map rather than
 * inventing its own colours or wording.
 */
export const RISK_CLASS_META: Record<RiskClass, { color: string; label: string }> = {
  likely_covered: { color: '#4ADE80', label: 'Likely covered' },
  uncertain: { color: '#FBBF24', label: 'Uncertain' },
  predicted_gap: { color: '#F87171', label: 'Predicted gap' },
};

const LEGEND_ORDER: RiskClass[] = ['likely_covered', 'uncertain', 'predicted_gap'];

export function ConnectivityLegend() {
  return (
    <View>
      <View className="flex-row gap-3 mb-2">
        {LEGEND_ORDER.map((riskClass) => (
          <View key={riskClass} className="flex-row items-center gap-1.5">
            <View
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: RISK_CLASS_META[riskClass].color }}
            />
            <Text className="text-[11.5px] font-semibold text-[#0F1B2E]">
              {RISK_CLASS_META[riskClass].label}
            </Text>
          </View>
        ))}
      </View>
      <Text className="text-[11px] text-[rgba(15,27,46,0.5)]">
        Planning prediction, not confirmed coverage.
      </Text>
    </View>
  );
}
