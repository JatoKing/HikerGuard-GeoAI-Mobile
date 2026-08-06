/**
 * app/app-info/index.tsx
 *
 * App Info — "Home" tab (route: /app-info)
 * -------------------------------------------------
 * Project Objective (highlight card), Project Agenda (vertical timeline),
 * and Expected Outcome (2-column card grid). Shares its header, colors,
 * bottom nav, and data with the "Map" tab via ./_shared — see that file
 * for the full data set and the BottomNav's cross-route navigation.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS,
  PHASES,
  OUTCOMES,
  AppInfoHeader,
  AppInfoFooter,
  BottomNav,
  sharedStyles,
} from '@/components/app-info/shared';

export default function AppInfoHomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={sharedStyles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppInfoHeader />

        {/* project objective — highlight card */}
        <View style={sharedStyles.infoSection}>
          <View style={sharedStyles.infoLabelRow}>
            <Text style={sharedStyles.infoLabelNumber}>01</Text>
            <Text style={sharedStyles.infoLabel}>OBJECTIVE</Text>
          </View>

          <View style={styles.objectiveCard}>
            <View style={styles.objectiveAccentBar} />
            <View style={styles.objectiveCardInner}>
              <View style={styles.objectiveIconWrap}>
                <Ionicons name="sparkles-outline" size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.objectiveText}>
                JEJAK is a GeoAI-powered platform that predicts likely
                communication connectivity gaps along hiking trails using
                terrain, vegetation, and telecommunications data. It empowers
                hikers with offline connectivity planning predictions so they
                can prepare before a hike, rather than a guarantee of
                coverage. Collected location and event data may later support
                Search and Rescue (SAR) efforts with last-known connectivity
                information — combining geospatial AI, Earth Observation, and
                telecommunications analytics into an explainable
                decision-support system for safer outdoor adventures.
              </Text>
            </View>
          </View>
        </View>

        {/* project agenda / work plan — vertical timeline */}
        <View style={sharedStyles.infoSection}>
          <View style={sharedStyles.infoLabelRow}>
            <Text style={sharedStyles.infoLabelNumber}>02</Text>
            <Text style={sharedStyles.infoLabel}>AGENDA / WORK PLAN</Text>
          </View>

          <View style={{ marginTop: 4 }}>
            {PHASES.map((phase, i) => (
              <View key={phase.title} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot}>
                    <Ionicons name={phase.icon} size={16} color="#0B1524" />
                  </View>
                  {i !== PHASES.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTag}>{phase.short.toUpperCase()}</Text>
                  <Text style={styles.timelineTitle}>{phase.title}</Text>
                  <Text style={styles.timelineBody}>{phase.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* expected outcome — 2-column card grid + summary */}
        <View style={sharedStyles.infoSection}>
          <View style={sharedStyles.infoLabelRow}>
            <Text style={sharedStyles.infoLabelNumber}>03</Text>
            <Text style={sharedStyles.infoLabel}>EXPECTED OUTCOME</Text>
          </View>

          <View style={styles.outcomeGrid}>
            {OUTCOMES.map((outcome, i) => (
              <View
                key={outcome.label}
                style={[
                  styles.outcomeCard,
                  // odd count — let the last card take the full row
                  i === OUTCOMES.length - 1 && OUTCOMES.length % 2 === 1
                    ? styles.outcomeCardFull
                    : styles.outcomeCardHalf,
                ]}
              >
                <View style={styles.outcomeCardIconWrap}>
                  <Ionicons name={outcome.icon} size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.outcomeCardTitle}>{outcome.label}</Text>
                <Text style={styles.outcomeCardDesc}>{outcome.description}</Text>
              </View>
            ))}
          </View>

          <Text style={[sharedStyles.infoBody, { marginTop: 18 }]}>
            Together, these outcomes improve hiking safety and offline
            connectivity planning, may later support Search and Rescue
            efforts, and enable authorities to optimize telecommunications
            infrastructure planning in remote recreational areas through
            explainable GeoAI analytics.
          </Text>
        </View>

        <AppInfoFooter />
      </ScrollView>

      <BottomNav activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  // Objective — highlight card with a solid accent bar down the left edge.
  objectiveCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.pillBg,
    borderWidth: 1,
    borderColor: COLORS.pillBorder,
    borderRadius: 20,
    overflow: 'hidden',
  },
  objectiveAccentBar: {
    width: 4,
    backgroundColor: COLORS.accent,
  },
  objectiveCardInner: {
    flex: 1,
    padding: 18,
  },
  objectiveIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  objectiveText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textMuted,
  },
  // Agenda — vertical timeline: fixed-width rail (icon dot + connecting
  // line) on the left, content on the right. The line is a flex:1 child
  // inside the rail column, so it auto-stretches to match each row's
  // (variable) content height.
  timelineRow: {
    flexDirection: 'row',
  },
  timelineRail: {
    width: 40,
    alignItems: 'center',
  },
  timelineDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.pillBorder,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 26,
  },
  timelineTag: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  timelineBody: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textMuted,
  },
  // Outcome — 2-column card grid.
  outcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  outcomeCard: {
    backgroundColor: COLORS.pillBg,
    borderWidth: 1,
    borderColor: COLORS.pillBorder,
    borderRadius: 18,
    padding: 14,
  },
  outcomeCardHalf: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  outcomeCardFull: {
    flexBasis: '100%',
  },
  outcomeCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  outcomeCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  outcomeCardDesc: {
    fontSize: 12,
    lineHeight: 16.5,
    color: COLORS.textMuted,
  },
});
