import React from 'react';
import { View, Text } from 'react-native';

import type { TrailPack } from '@/src/domain/trail';

function formatAge(fromIso: string): string {
  const ms = Date.now() - new Date(fromIso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

/**
 * Surfaces the fields the handoff contract requires a downloaded pack to
 * disclose (Section 8 model info + WP2 definition of done): model version,
 * proxy/planning status, and field-validation status — never presented as
 * confirmed coverage.
 */
export function OfflinePackStatus({ pack }: { pack: TrailPack }) {
  const { model } = pack;

  return (
    <View className="bg-[rgba(15,27,46,0.04)] border border-[rgba(15,27,46,0.1)] rounded-[16px] p-4">
      <Text className="text-[11px] font-bold text-[rgba(15,27,46,0.5)] tracking-[0.6px] mb-2">
        OFFLINE PACK STATUS
      </Text>

      <View className="flex-row justify-between mb-1.5">
        <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">Pack generated</Text>
        <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">
          {formatAge(pack.generatedAt)}
        </Text>
      </View>
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">Model version</Text>
        <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">{model.modelVersion}</Text>
      </View>
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">Validation level</Text>
        <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">{model.validationLevel}</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[12.5px] text-[rgba(15,27,46,0.6)]">Field-validated</Text>
        <Text className="text-[12.5px] font-semibold text-[#0F1B2E]">
          {model.fieldValidated ? 'Yes' : 'No'}
        </Text>
      </View>

      <View className="h-[1px] bg-[rgba(15,27,46,0.08)] my-3" />

      <Text className="text-[11px] text-[rgba(15,27,46,0.5)]">
        Intended use: {model.intendedUse.replace(/_/g, ' ')}. This pack is a planning prediction,
        not confirmed coverage.
      </Text>
    </View>
  );
}
