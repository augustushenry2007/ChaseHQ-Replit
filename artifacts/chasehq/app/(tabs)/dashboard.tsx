import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { CHASE_FEED, ACTIVITY, getStats, formatUSD, USER, type ActivityItem, type ActivityType } from "@/lib/data";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  Escalated: { bg: "#FEE2E2", text: "#DC2626", dot: "#DC2626" },
  Overdue: { bg: "#FEF3C7", text: "#D97706", dot: "#F59E0B" },
  "Follow-up": { bg: "#FEF9C3", text: "#A16207", dot: "#EAB308" },
  Upcoming: { bg: "#DBEAFE", text: "#2563EB", dot: "#3B82F6" },
  Paid: { bg: "#DCFCE7", text: "#16A34A", dot: "#22C55E" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] ?? { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8" };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: s.dot }]} />
      <Text style={[styles.badgeText, { color: s.text }]}>{status}</Text>
    </View>
  );
}

const ACTIVITY_ICON_CONFIG: Record<ActivityType, { bg: string; icon: keyof typeof Feather.glyphMap }> = {
  payment: { bg: "#DCFCE7", icon: "check" },
  reminder: { bg: "#DBEAFE", icon: "mail" },
  escalation: { bg: "#FEE2E2", icon: "alert-triangle" },
  view: { bg: "#F3E8FF", icon: "eye" },
  overdue: { bg: "#FEF3C7", icon: "clock" },
  reply: { bg: "#DBEAFE", icon: "message-square" },
};

function ActivityIcon({ type }: { type: ActivityType }) {
  const cfg = ACTIVITY_ICON_CONFIG[type];
  const color = type === "payment" ? "#16A34A" : type === "escalation" ? "#DC2626" : type === "overdue" ? "#D97706" : type === "view" ? "#7C3AED" : "#2563EB";
  return (
    <View style={[styles.activityIconBg, { backgroundColor: cfg.bg }]}>
      <Feather name={cfg.icon} size={12} color={color} />
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const stats = getStats();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.px}>
        <Text style={[styles.greeting, { color: colors.foreground }]}>
          Good morning, {USER.name.split(" ")[0]}
        </Text>
        <Text style={[styles.greetingSub, { color: colors.mutedForeground }]}>
          Here's what needs your attention today.
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            label="Outstanding"
            value={formatUSD(stats.outstandingTotal)}
            sub={`${stats.outstandingCount} invoices`}
            icon="trending-up"
            iconColor="#3B82F6"
            colors={colors}
          />
          <StatCard
            label="Overdue"
            value={formatUSD(stats.overdueTotal)}
            sub={`${stats.overdueCount} need action`}
            icon="alert-triangle"
            iconColor="#F59E0B"
            valueColor="#DC2626"
            colors={colors}
          />
        </View>
        <View style={[styles.statsRowSingle]}>
          <StatCard
            label="Paid this Month"
            value={formatUSD(stats.paidTotal)}
            sub={`${stats.paidCount} invoices collected`}
            icon="check-circle"
            iconColor="#22C55E"
            valueColor="#16A34A"
            colors={colors}
            wide
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Chase Feed</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Prioritised actions</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/invoices")} testID="view-all-btn">
            <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
          </TouchableOpacity>
        </View>
        {CHASE_FEED.map((inv, i) => (
          <TouchableOpacity
            key={inv.id}
            style={[styles.chaseRow, { borderBottomColor: colors.border, borderBottomWidth: i < CHASE_FEED.length - 1 ? 1 : 0 }]}
            onPress={() => router.push({ pathname: "/invoice/[id]", params: { id: inv.id } })}
            testID={`chase-item-${inv.id}`}
          >
            <View style={[styles.chaseDot, { backgroundColor: STATUS_CONFIG[inv.status]?.dot ?? "#94A3B8" }]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.chaseClientRow}>
                <Text style={[styles.chaseClient, { color: colors.foreground }]}>{inv.client}</Text>
                <Text style={[styles.chaseId, { color: colors.mutedForeground }]}>{inv.id}</Text>
                <StatusBadge status={inv.status} />
              </View>
              <Text style={[styles.chaseDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                {inv.daysPastDue > 0 ? `${inv.daysPastDue} days overdue` : inv.description}
              </Text>
            </View>
            <Text style={[styles.chaseAmount, { color: colors.foreground }]}>{formatUSD(inv.amount)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Latest updates</Text>
          </View>
        </View>
        {ACTIVITY.map((item, i) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.activityRow, { borderBottomColor: colors.border, borderBottomWidth: i < ACTIVITY.length - 1 ? 1 : 0 }]}
            onPress={() => router.push({ pathname: "/invoice/[id]", params: { id: item.invoiceId } })}
          >
            <ActivityIcon type={item.type} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.activityClient, { color: colors.foreground }]} numberOfLines={1}>
                {item.client} <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>· {item.invoiceId}</Text>
              </Text>
              <Text style={[styles.activityDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{item.timeAgo}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({
  label, value, sub, icon, iconColor, valueColor, colors, wide,
}: {
  label: string;
  value: string;
  sub: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  valueColor?: string;
  colors: ReturnType<typeof useColors>;
  wide?: boolean;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, flex: wide ? 1 : 1 }]}>
      <View style={styles.statCardTop}>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
      <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  px: { paddingHorizontal: 16, marginBottom: 16 },
  greeting: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  greetingSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statsRowSingle: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
  statSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  viewAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  chaseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  chaseDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  chaseClientRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" },
  chaseClient: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  chaseId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  chaseDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  chaseAmount: { fontSize: 13, fontFamily: "Inter_700Bold", flexShrink: 0 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  activityIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  activityClient: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  activityDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  activityTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0, marginTop: 1 },
});
