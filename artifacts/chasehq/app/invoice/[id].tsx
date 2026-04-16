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

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string; border: string }> = {
  Escalated: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
  Overdue: { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  "Follow-up": { bg: "#FEF9C3", text: "#A16207", border: "#FEF08A" },
  Upcoming: { bg: "#DBEAFE", text: "#2563EB", border: "#BFDBFE" },
  Paid: { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0" },
};

type Tone = "Polite" | "Friendly" | "Firm" | "Urgent";
const TONES: Tone[] = ["Polite", "Friendly", "Firm", "Urgent"];

type DotState = "done" | "active" | "pending" | "reply";

function getTimeline(invoice: Invoice) {
  const base = [
    { label: "Invoice sent", state: "done" as DotState },
    { label: "1st reminder", state: "pending" as DotState },
    { label: "2nd reminder", state: "pending" as DotState },
    { label: "Final notice", state: "pending" as DotState },
    { label: "Resolved", state: "pending" as DotState },
  ];

  let events = [...base];
  if (invoice.status === "Paid") events = events.map((e) => ({ ...e, state: "done" as DotState }));
  else if (invoice.status === "Escalated") events = events.map((e, i) => ({ ...e, state: (i < 4 ? "done" : "active") as DotState }));
  else if (invoice.status === "Overdue") events = events.map((e, i) => ({ ...e, state: (i <= 1 ? "done" : i === 2 ? "active" : "pending") as DotState }));
  else if (invoice.status === "Follow-up") events = events.map((e, i) => ({ ...e, state: (i === 0 ? "done" : i === 1 ? "active" : "pending") as DotState }));

  if (invoice.clientReply) {
    const replyEvent = { label: "Client replied", state: "reply" as DotState };
    const lastDoneIdx = events.map((e) => e.state === "done").lastIndexOf(true);
    events.splice(lastDoneIdx + 1, 0, replyEvent);
  }
  return events;
}

function getDraft(invoice: Invoice, tone: Tone, variant: number): string {
  const drafts: Record<Tone, string[]> = {
    Polite: [
      `Hi ${invoice.client} team,\n\nI hope you're well. I'm writing to kindly follow up on invoice ${invoice.id} for ${formatUSD(invoice.amount)}, which was due on ${invoice.dueDate}.\n\nIf there's been an oversight, no worries at all — I'd just appreciate a quick update when you get a chance.\n\nThanks so much,\nJamie Doe`,
      `Hello,\n\nI hope things are going well. I wanted to gently check in on invoice ${invoice.id} (${formatUSD(invoice.amount)}, due ${invoice.dueDate}).\n\nIf anything is holding up payment, I'm happy to chat and find a solution.\n\nWarm regards,\nJamie`,
      `Dear ${invoice.client},\n\nFollowing up on invoice ${invoice.id} for ${formatUSD(invoice.amount)}${invoice.daysPastDue > 0 ? `, now ${invoice.daysPastDue} days overdue` : ""}.\n\nCould you let me know when I might expect payment?\n\nThank you,\nJamie Doe`,
    ],
    Friendly: [
      `Hi there,\n\nJust a quick reminder that invoice ${invoice.id} for ${formatUSD(invoice.amount)} is${invoice.daysPastDue > 0 ? ` now ${invoice.daysPastDue} days overdue` : ` due on ${invoice.dueDate}`}.\n\nCould you let me know if everything is in order?\n\nThanks,\nJamie`,
      `Hey,\n\nChecking in on invoice ${invoice.id} for ${formatUSD(invoice.amount)} — just want to make sure it didn't slip through the cracks!\n\nLet me know if you need anything.\n\nCheers,\nJamie`,
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
    setTimeout(() => {
      setVariantIndex((v) => (v + 1) % 3);
      setIsGenerating(false);
    }, 800);
  }

  function handleSend() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.backRow, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Invoices</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.px}>
        <View style={styles.invoiceHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.invoiceId, { color: colors.mutedForeground }]}>{invoice.id}</Text>
            <Text style={[styles.clientName, { color: colors.foreground }]}>{invoice.client}</Text>
            <Text style={[styles.clientEmail, { color: colors.mutedForeground }]}>{invoice.clientEmail}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{invoice.status}</Text>
          </View>
        </View>

        <View style={[styles.amountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Amount due</Text>
            <Text style={[styles.amountValue, { color: colors.foreground }]}>{formatUSD(invoice.amount)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.detailGrid}>
            {[
              { label: "Due date", value: invoice.dueDate },
              { label: "Days overdue", value: invoice.daysPastDue > 0 ? `${invoice.daysPastDue} days` : "—" },
              { label: "Description", value: invoice.description },
              { label: "Payment", value: invoice.paymentDetails },
            ].map((row) => (
              <View key={row.label} style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {invoice.clientReply && (
          <View style={[styles.replyCard, { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" }]}>
            <View style={styles.replyCardHeader}>
              <Feather name="message-square" size={14} color="#0369A1" />
              <Text style={styles.replyCardTitle}>Client replied · {invoice.clientReply.receivedAt}</Text>
            </View>
            <Text style={styles.replyCardText}>{invoice.clientReply.snippet}</Text>
          </View>
        )}

        <View style={[styles.draftCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.draftHeader}>
            <Text style={[styles.draftTitle, { color: colors.foreground }]}>Follow-up draft</Text>
            <View style={[styles.toneToggle, { backgroundColor: colors.muted }]}>
              {TONES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => handleToneChange(t)}
                  style={[styles.toneBtn, { backgroundColor: tone === t ? colors.dark : "transparent" }]}
                  testID={`tone-${t}`}
                >
                  <Text style={[styles.toneBtnText, { color: tone === t ? "#FFFFFF" : colors.mutedForeground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={[styles.draftMeta, { color: colors.mutedForeground }]}>
            To: {invoice.clientEmail}  From: {invoice.sentFrom}
          </Text>
          <View style={styles.draftBody}>
            {isGenerating ? (
              <View style={styles.generatingOverlay}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.generatingText, { color: colors.primary }]}>Generating…</Text>
              </View>
            ) : (
              <TextInput
                value={currentDraft}
                onChangeText={(t) => setCustomDraft(t)}
                multiline
                style={[styles.draftInput, { color: colors.foreground, borderColor: colors.border }]}
                textAlignVertical="top"
                testID="draft-input"
              />
            )}
          </View>
          <View style={styles.draftActions}>
            <TouchableOpacity
              style={[styles.regenerateBtn, { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" }]}
              onPress={handleRegenerate}
              disabled={isGenerating}
              testID="regenerate-btn"
            >
              <Feather name="refresh-cw" size={12} color="#0369A1" />
              <Text style={styles.regenerateText}>Regenerate</Text>
              <Text style={styles.variantText}>{variantIndex + 1}/3</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: sent ? "#16A34A" : colors.dark }]}
              onPress={handleSend}
              testID="send-btn"
            >
              <Text style={styles.sendBtnText}>{sent ? "Sent!" : "Send Follow-up"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Chase Timeline</Text>
          <Text style={[styles.timelineSub, { color: colors.mutedForeground }]}>Automated follow-up sequence</Text>
          <View style={{ marginTop: 16 }}>
            {timeline.map((event, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineDotCol}>
                  <TimelineDot state={event.state} colors={colors} />
                  {i < timeline.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: event.state === "done" || event.state === "reply" ? "#BBF7D0" : colors.border }]} />
                  )}
                </View>
                <View style={[styles.timelineContent, { paddingBottom: i < timeline.length - 1 ? 24 : 0 }]}>
                  <Text style={[styles.timelineLabel, { color: event.state === "pending" ? colors.mutedForeground : event.state === "reply" ? "#2563EB" : colors.foreground }]}>
                    {event.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {invoiceActivity.length > 0 && (
          <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Activity</Text>
            {invoiceActivity.map((item, i) => (
              <View
                key={item.id}
                style={[styles.activityRow, { borderBottomColor: colors.border, borderBottomWidth: i < invoiceActivity.length - 1 ? 1 : 0 }]}
              >
                <View style={[styles.activityDot, { backgroundColor: item.type === "reply" ? "#3B82F6" : colors.mutedForeground }]} />
                <Text style={[styles.activityDesc, { color: item.type === "reply" ? "#1D4ED8" : colors.foreground }]} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{item.timeAgo}</Text>
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
      <View style={[styles.dot, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}>
        <Feather name="check" size={10} color="#16A34A" />
      </View>
    );
  }
  if (state === "reply") {
    return (
      <View style={[styles.dot, { backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" }]}>
        <Feather name="message-square" size={10} color="#2563EB" />
      </View>
    );
  }
  if (state === "active") {
    return <View style={[styles.dot, { backgroundColor: "#3B82F6", borderColor: "#BFDBFE" }]} />;
  }
  return <View style={[styles.dot, { backgroundColor: colors.muted, borderColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 14, fontFamily: "Inter_500Medium" },
  backRow: { paddingHorizontal: 16, marginBottom: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  px: { paddingHorizontal: 16 },
  invoiceHeaderRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  invoiceId: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 3 },
  clientName: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
  clientEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statusBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  amountCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  amountLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  amountValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  divider: { height: 1, marginBottom: 12 },
  detailGrid: { gap: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right", marginLeft: 12 },
  replyCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
  replyCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  replyCardTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0369A1" },
  replyCardText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#0F172A", lineHeight: 19 },
  draftCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  draftHeader: { marginBottom: 10 },
  draftTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  toneToggle: { flexDirection: "row", borderRadius: 8, overflow: "hidden", alignSelf: "flex-start" },
  toneBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  toneBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  draftMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 10 },
  draftBody: { minHeight: 140, marginBottom: 12 },
  generatingOverlay: { flex: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, minHeight: 140 },
  generatingText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  draftInput: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, borderWidth: 1, borderRadius: 10, padding: 12 },
  draftActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  regenerateBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  regenerateText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0369A1" },
  variantText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#60A5FA" },
  sendBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  timelineCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  timelineTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  timelineSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  timelineItem: { flexDirection: "row", gap: 12 },
  timelineDotCol: { alignItems: "center", width: 20 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  timelineLine: { width: 2, flex: 1, marginTop: 2 },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  activityCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  activityRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, gap: 10 },
  activityDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  activityDesc: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  activityTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
});
