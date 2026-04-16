import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { getInvoiceById, ACTIVITY, formatUSD, type Invoice, type InvoiceStatus } from "@/lib/data";

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string; dot: string }> = {
  Escalated: { bg: "#FEE2E2", text: "#DC2626", dot: "#DC2626" },
  Overdue: { bg: "#FEF3C7", text: "#D97706", dot: "#F59E0B" },
  "Follow-up": { bg: "#FEF9C3", text: "#A16207", dot: "#EAB308" },
  Upcoming: { bg: "#DBEAFE", text: "#2563EB", dot: "#3B82F6" },
  Paid: { bg: "#DCFCE7", text: "#16A34A", dot: "#22C55E" },
};

type Tone = "Polite" | "Friendly" | "Firm" | "Urgent";
const TONES: Tone[] = ["Polite", "Friendly", "Firm", "Urgent"];

type DotState = "done" | "active" | "pending" | "resolved";

interface TimelineEvent {
  label: string;
  date: string;
  state: DotState;
}

function getDates(invoice: Invoice): string[] {
  const due = new Date(invoice.dueDateISO);
  const sentDate = new Date(due);
  sentDate.setDate(sentDate.getDate() - 30);
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(sentDate);
    d.setDate(d.getDate() + i * 7);
    dates.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }
  return dates;
}

function getTimeline(invoice: Invoice): TimelineEvent[] {
  const dates = getDates(invoice);
  const base: TimelineEvent[] = [
    { label: "Invoice sent", date: dates[0], state: "done" },
    { label: "1st reminder", date: dates[1], state: "pending" },
    { label: "2nd reminder", date: dates[2], state: "pending" },
    { label: "Final notice", date: dates[3], state: "pending" },
    { label: "Resolved", date: "", state: "pending" },
  ];

  if (invoice.status === "Paid") {
    return base.map((e) => ({ ...e, state: e.label === "Resolved" ? "resolved" : "done" }));
  }
  if (invoice.status === "Escalated") {
    return base.map((e, i) => ({ ...e, state: i < 4 ? "done" : "active" })) as TimelineEvent[];
  }
  if (invoice.status === "Overdue") {
    return base.map((e, i) => ({ ...e, state: i <= 1 ? "done" : i === 2 ? "active" : "pending" })) as TimelineEvent[];
  }
  if (invoice.status === "Follow-up") {
    return base.map((e, i) => ({ ...e, state: i === 0 ? "done" : i === 1 ? "active" : "pending" })) as TimelineEvent[];
  }
  return base;
}

function getDraft(invoice: Invoice, tone: Tone, variant: number): string {
  const drafts: Record<Tone, string[]> = {
    Polite: [
      `Hi ${invoice.client} team,\n\nI hope you're well. I'm writing to kindly follow up on invoice ${invoice.id} for ${formatUSD(invoice.amount)}, which was due on ${invoice.dueDate}.\n\nIf there's been an oversight, no worries at all — I'd just appreciate a quick update when you get a chance.\n\nThanks so much,\nJamie Doe`,
      `Hello,\n\nI hope things are going well. I wanted to gently check in on invoice ${invoice.id} (${formatUSD(invoice.amount)}, due ${invoice.dueDate}).\n\nIf anything is holding up payment, I'm happy to chat and find a solution.\n\nWarm regards,\nJamie`,
      `Dear ${invoice.client},\n\nFollowing up on invoice ${invoice.id} for ${formatUSD(invoice.amount)}${invoice.daysPastDue > 0 ? `, now ${invoice.daysPastDue} days overdue` : ""}.\n\nCould you let me know when I might expect payment?\n\nThank you,\nJamie Doe`,
    ],
    Friendly: [
      `Hi there,\n\nJust a quick reminder that invoice ${invoice.id} for ${formatUSD(invoice.amount)} is${invoice.daysPastDue > 0 ? ` now ${invoice.daysPastDue} days overdue (due ${invoice.dueDate})` : ` due on ${invoice.dueDate}`}.\n\nCould you let me know if everything is in order?\n\nThanks,\nJamie`,
      `Hey,\n\nChecking in on invoice ${invoice.id} for ${formatUSD(invoice.amount)} — just want to make sure it didn't slip through the cracks!\n\nLet me know if you need anything from my side.\n\nCheers,\nJamie`,
      `Hi ${invoice.client} team,\n\nHope all is well! Noticed invoice ${invoice.id} (${formatUSD(invoice.amount)}) hasn't come through yet. Happy to resend details if helpful.\n\nBest,\nJamie`,
    ],
    Firm: [
      `Hi,\n\nI'm writing to formally request payment for invoice ${invoice.id} (${formatUSD(invoice.amount)}), now ${invoice.daysPastDue} days past due.\n\nPlease arrange payment within 7 days or contact me to discuss.\n\nRegards,\nJamie Doe`,
      `Dear ${invoice.client},\n\nInvoice ${invoice.id} for ${formatUSD(invoice.amount)} remains outstanding. I need to know when payment will be made.\n\nPlease respond by end of week.\n\nJamie Doe`,
      `To the accounts team,\n\nThis is a formal reminder: invoice ${invoice.id} for ${formatUSD(invoice.amount)} is ${invoice.daysPastDue} days overdue. Continued delays may require escalation.\n\nJamie Doe`,
    ],
    Urgent: [
      `URGENT: Invoice ${invoice.id} for ${formatUSD(invoice.amount)} is ${invoice.daysPastDue} days overdue. Immediate payment required. If I don't hear back within 48 hours, I will pursue formal collection proceedings.\n\nJamie Doe`,
      `This is final notice for invoice ${invoice.id} (${formatUSD(invoice.amount)}). Payment must be received within 48 hours or this matter will be escalated to a collections agency.\n\nJamie Doe`,
      `FINAL NOTICE: Invoice ${invoice.id} is now critically overdue. ${formatUSD(invoice.amount)} must be paid immediately. Legal action will commence if payment is not received within 24 hours.\n\nJamie Doe`,
    ],
  };
  return drafts[tone][variant % 3];
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const invoice = getInvoiceById(id);
  const [tone, setTone] = useState<Tone>("Friendly");
  const [variantIndex, setVariantIndex] = useState(0);
  const [customDraft, setCustomDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sent, setSent] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);

  if (!invoice) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Feather name="file-text" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Invoice not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = STATUS_STYLE[invoice.status];
  const timeline = getTimeline(invoice);
  const currentDraft = customDraft ?? getDraft(invoice, tone, variantIndex);
  const invoiceActivity = ACTIVITY.filter((a) => a.invoiceId === invoice.id);

  function handleToneChange(t: Tone) {
    setTone(t);
    setCustomDraft(null);
    setVariantIndex(0);
  }

  function handleRegenerate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGenerating(true);
    setCustomDraft(null);
    setTimeout(() => { setVariantIndex((v) => (v + 1) % 3); setIsGenerating(false); }, 800);
  }

  function handleSend() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const detailRows = [
    { label: "Invoice ID", value: invoice.id, color: colors.foreground },
    { label: "Client", value: invoice.client, color: colors.foreground },
    { label: "Email", value: invoice.clientEmail, color: colors.foreground },
    { label: "Amount", value: formatUSD(invoice.amount), color: colors.foreground },
    { label: "Due date", value: invoice.dueDate, color: colors.foreground },
    ...(invoice.daysPastDue > 0
      ? [{ label: "Overdue by", value: `${invoice.daysPastDue} days`, color: "#DC2626" }]
      : []),
    { label: "Sent from", value: invoice.sentFrom, color: colors.foreground },
    { label: "Payment", value: invoice.paymentDetails, color: colors.foreground },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <Feather name="arrow-left" size={15} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to Invoices</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.px}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.heroClient, { color: colors.foreground }]} numberOfLines={1}>{invoice.client}</Text>
            <Text style={[styles.heroDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{invoice.description}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Text style={[styles.heroAmount, { color: colors.foreground }]}>{formatUSD(invoice.amount)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{invoice.status}</Text>
            </View>
          </View>
        </View>

        {invoice.clientReply && (
          <View style={[styles.replyCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <View style={styles.replyCardHeader}>
              <Feather name="message-square" size={13} color="#2563EB" />
              <Text style={styles.replyCardTitle}>Client replied · {invoice.clientReply.receivedAt}</Text>
            </View>
            <Text style={styles.replyCardText}>{invoice.clientReply.snippet}</Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.cardCollapsibleHeader}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDetailsOpen((v) => !v); }}
            testID="invoice-details-toggle"
          >
            <Text style={[styles.cardSectionTitle, { color: colors.foreground }]}>Invoice details</Text>
            <Feather name={detailsOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {detailsOpen && (
            <View style={[styles.detailsBody, { borderTopColor: colors.border }]}>
              {detailRows.map((row, i) => (
                <View
                  key={row.label}
                  style={[styles.detailRow, { borderBottomColor: colors.border, borderBottomWidth: i < detailRows.length - 1 ? 1 : 0 }]}
                >
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[styles.detailValue, { color: row.color, fontFamily: row.color === "#DC2626" ? "Inter_600SemiBold" : "Inter_400Regular" }]} numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardSectionTitle, { color: colors.foreground, paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 }]}>Send follow-up</Text>
          <View style={styles.toneRow}>
            {TONES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => handleToneChange(t)}
                style={[styles.tonePill, {
                  backgroundColor: tone === t ? colors.dark : "transparent",
                  borderColor: tone === t ? colors.dark : colors.border,
                }]}
                testID={`tone-${t}`}
              >
                <Text style={[styles.tonePillText, { color: tone === t ? "#FFFFFF" : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.draftArea}>
            {isGenerating ? (
              <View style={styles.generatingBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.generatingText, { color: colors.primary }]}>Generating…</Text>
              </View>
            ) : (
              <TextInput
                value={currentDraft}
                onChangeText={(t) => setCustomDraft(t)}
                multiline
                scrollEnabled
                style={[styles.draftInput, { color: colors.foreground }]}
                textAlignVertical="top"
                testID="draft-input"
              />
            )}
          </View>

          <View style={styles.draftActions}>
            <TouchableOpacity
              style={[styles.regenBtn, { borderColor: colors.border }]}
              onPress={handleRegenerate}
              disabled={isGenerating}
              testID="regenerate-btn"
            >
              <Feather name="refresh-cw" size={13} color={colors.foreground} />
              <Text style={[styles.regenText, { color: colors.foreground }]}>Regenerate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: sent ? "#16A34A" : colors.dark }]}
              onPress={handleSend}
              testID="send-btn"
            >
              <Feather name="send" size={13} color="#FFFFFF" />
              <Text style={styles.sendBtnText}>{sent ? "Sent!" : "Send follow-up"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 16 }]}>
          <Text style={[styles.cardSectionTitle, { color: colors.foreground, marginBottom: 16 }]}>Chase timeline</Text>
          {timeline.map((event, i) => (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.timelineDotCol}>
                <TimelineDot state={event.state} colors={colors} />
                {i < timeline.length - 1 && (
                  <View style={[styles.timelineLine, {
                    backgroundColor: event.state === "done" ? "#86EFAC" : colors.border,
                  }]} />
                )}
              </View>
              <View style={[styles.timelineContent, { paddingBottom: i < timeline.length - 1 ? 22 : 0 }]}>
                <Text style={[styles.timelineLabel, {
                  color: event.state === "resolved" ? colors.primary :
                    event.state === "active" ? colors.primary :
                    event.state === "done" ? colors.foreground : colors.mutedForeground,
                  fontFamily: event.state === "resolved" ? "Inter_600SemiBold" : "Inter_600SemiBold",
                }]}>{event.label}</Text>
                {event.date.length > 0 && (
                  <Text style={[styles.timelineDate, { color: colors.mutedForeground }]}>{event.date}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {invoiceActivity.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 16 }]}>
            <Text style={[styles.cardSectionTitle, { color: colors.foreground, marginBottom: 14 }]}>Activity</Text>
            {invoiceActivity.map((item, i) => (
              <View
                key={item.id}
                style={[styles.activityRow, { borderBottomColor: colors.border, borderBottomWidth: i < invoiceActivity.length - 1 ? 1 : 0 }]}
              >
                <View style={[styles.activityDot, { backgroundColor: item.type === "reply" ? "#3B82F6" : "#94A3B8" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityDesc, { color: colors.foreground }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{item.timeAgo}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function TimelineDot({ state, colors }: { state: DotState; colors: ReturnType<typeof useColors> }) {
  if (state === "done") {
    return (
      <View style={[styles.dot, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]}>
        <Feather name="check" size={10} color="#16A34A" />
      </View>
    );
  }
  if (state === "resolved") {
    return <View style={[styles.dot, { backgroundColor: colors.primary, borderColor: colors.primary }]} />;
  }
  if (state === "active") {
    return <View style={[styles.dot, { backgroundColor: colors.primary, borderColor: "#BAE6FD" }]} />;
  }
  return <View style={[styles.dot, { backgroundColor: "#FFFFFF", borderColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 14, fontFamily: "Inter_500Medium" },
  topBar: { paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  px: { paddingHorizontal: 16 },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  heroClient: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 3 },
  heroDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  heroAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  replyCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  replyCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  replyCardTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  replyCardText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#0F172A", lineHeight: 19 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardCollapsibleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  cardSectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  detailsBody: { borderTopWidth: 1 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 11, gap: 16 },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  detailValue: { fontSize: 13, flex: 1.4, textAlign: "right" },
  toneRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, flexWrap: "wrap", marginBottom: 14 },
  tonePill: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  tonePillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  draftArea: { marginHorizontal: 16, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", minHeight: 150, overflow: "hidden" },
  draftInput: { padding: 14, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, minHeight: 150 },
  generatingBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 150 },
  generatingText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  draftActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  regenBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  regenText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sendBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 20, paddingVertical: 11 },
  sendBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  timelineItem: { flexDirection: "row", gap: 14 },
  timelineDotCol: { alignItems: "center", width: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  timelineLine: { width: 2, flex: 1, marginTop: 3 },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 14, lineHeight: 22 },
  timelineDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  activityRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 11, gap: 12 },
  activityDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  activityDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  activityTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
