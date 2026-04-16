import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const Q0 = {
  label: "Just checking in",
  question: "When it comes to money conversations, I feel…",
  sub: "Select all that apply, or add your own.",
  placeholder: "e.g. stressed, resentful, powerless…",
  options: [
    { id: "anxious", label: "Anxious", detail: "I overthink every interaction and second-guess myself" },
    { id: "guilty", label: "Guilty", detail: "Like I shouldn't be asking for what I'm already owed" },
    { id: "frustrated", label: "Frustrated", detail: "It's exhausting and draining to deal with every time" },
  ],
};

const Q1 = {
  label: "A little more",
  question: "When I think about sending a follow-up…",
  sub: "Tick everything that rings true, or describe it yourself.",
  placeholder: "e.g. I freeze up, I feel embarrassed…",
  options: [
    { id: "hesitant", label: "I hesitate", detail: "I draft it five times and then don't send any of them" },
    { id: "relationship", label: "I worry", detail: "What if it damages the relationship or makes me look desperate?" },
    { id: "procrastinate", label: "I put it off", detail: "Until it's awkward to bring up and I've lost the moment" },
  ],
};

const Q2 = {
  label: "Last one",
  question: "What would actually make this easier?",
  sub: "Choose as many as feel right, or say it your way.",
  placeholder: "e.g. templates, a nudge, less guilt…",
  options: [
    { id: "words", label: "The right words", detail: "Already written — so I never stare at a blank screen again" },
    { id: "timing", label: "The right moment", detail: "Knowing exactly when to reach out without overthinking it" },
    { id: "automation", label: "Full automation", detail: "Set it and forget it — no manual effort from me at all" },
  ],
};

const INTEGRATIONS = [
  { name: "FreshBooks", color: "#1AB5D1", initial: "FB", desc: "Import invoices and sync payment status" },
  { name: "Xero", color: "#13B5EA", initial: "X", desc: "Pull unpaid invoices and trigger chase sequences" },
  { name: "QuickBooks", color: "#2BA01B", initial: "QB", desc: "Automatically chase overdue QBO invoices" },
  { name: "Bonsai", color: "#6C47FF", initial: "B", desc: "Sync freelance contracts and invoices" },
];

const TOTAL_STEPS = 6;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState(0);
  const [selected0, setSelected0] = useState<Set<string>>(new Set());
  const [selected1, setSelected1] = useState<Set<string>>(new Set());
  const [selected2, setSelected2] = useState<Set<string>>(new Set());
  const [custom0, setCustom0] = useState("");
  const [custom1, setCustom1] = useState("");
  const [custom2, setCustom2] = useState("");
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set());

  const progress = (step / TOTAL_STEPS) * 100;

  function canAdvance() {
    if (step === 0) return selected0.size > 0 || custom0.trim().length > 0;
    if (step === 1) return selected1.size > 0 || custom1.trim().length > 0;
    if (step === 2) return selected2.size > 0 || custom2.trim().length > 0;
    return step < TOTAL_STEPS;
  }

  function next() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => s - 1);
    }
  }

  async function finish() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeOnboarding();
    router.replace("/(tabs)/dashboard");
  }

  function toggleIntegration(name: string) {
    setConnectedIntegrations((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  }

  function buildFeelingLabel() {
    const labels = Array.from(selected0).map((id) => Q0.options.find((o) => o.id === id)?.label.toLowerCase() ?? id);
    if (custom0.trim()) labels.push(custom0.trim().toLowerCase());
    if (labels.length === 0) return "";
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
  }

  const feelingLabel = buildFeelingLabel();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function makeToggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    return (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setter((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
      });
    };
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          onPress={back}
          style={[styles.navBtn, { borderColor: step > 0 ? colors.border : "transparent", opacity: step > 0 ? 1 : 0 }]}
          disabled={step === 0}
          testID="back-btn"
        >
          <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: colors.primary }]} />
        </View>

        <TouchableOpacity
          onPress={() => canAdvance() && next()}
          style={[styles.navBtn, { borderColor: canAdvance() ? colors.border : "transparent", opacity: canAdvance() ? 1 : 0 }]}
          disabled={!canAdvance()}
        >
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {step === 0 && (
            <MultiSelectStep
              config={Q0}
              selected={selected0}
              onToggle={makeToggle(setSelected0)}
              onNext={next}
              canGo={canAdvance()}
              customText={custom0}
              setCustomText={setCustom0}
              colors={colors}
            />
          )}

          {step === 1 && (
            <MultiSelectStep
              config={Q1}
              selected={selected1}
              onToggle={makeToggle(setSelected1)}
              onNext={next}
              canGo={canAdvance()}
              customText={custom1}
              setCustomText={setCustom1}
              colors={colors}
            />
          )}

          {step === 2 && (
            <MultiSelectStep
              config={Q2}
              selected={selected2}
              onToggle={makeToggle(setSelected2)}
              onNext={next}
              canGo={canAdvance()}
              customText={custom2}
              setCustomText={setCustom2}
              colors={colors}
            />
          )}

          {step === 3 && (
            <View>
              {feelingLabel.length > 0 && (
                <View style={[styles.pill, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.pillText, { color: colors.accentForeground }]}>
                    You said you feel {feelingLabel}
                  </Text>
                </View>
              )}
              <Text style={[styles.empathyText, { color: colors.mutedForeground }]}>
                {selected0.size + (custom0.trim() ? 1 : 0) > 1
                  ? "You're not carrying just one thing. That combination makes sense — and it's more common than you'd think."
                  : selected0.has("anxious")
                  ? "That anxiety isn't a flaw. It means you care about how you come across."
                  : selected0.has("guilty")
                  ? "That guilt is real. But you did the work — you've already earned this."
                  : selected0.has("frustrated")
                  ? "That frustration makes sense. You shouldn't have to fight this hard to get paid."
                  : "That makes sense. You're not alone in this struggle."}
              </Text>
              <View style={[styles.darkBox, { backgroundColor: colors.dark }]}>
                <Text style={styles.darkBoxLine1}>The real problem isn't you.</Text>
                <Text style={styles.darkBoxLine2}>It's deciding what to say, when to say it, and how.</Text>
              </View>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                And that's where you stop. You don't make those decisions anymore — we do.
              </Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={next} testID="show-how-btn">
                <Text style={styles.primaryBtnText}>Show me how</Text>
                <Feather name="arrow-right" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={[styles.label, { color: colors.primary }]}>How it removes the mental load</Text>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Three things you'll never overthink again.
              </Text>
              <View style={{ marginTop: 16, gap: 16 }}>
                {[
                  { icon: "edit-3" as const, text: "Your voice, automatically.", detail: "We learn how you speak and draft every message to match." },
                  { icon: "trending-up" as const, text: "The right escalation path.", detail: "Friendly first, then gradually firmer. We handle the timing." },
                  { icon: "file-text" as const, text: "Formal when needed.", detail: "Formal notices are ready, reviewed by you, then sent." },
                ].map((item) => (
                  <View key={item.icon} style={styles.featureItem}>
                    <View style={[styles.featureIconBox, { backgroundColor: colors.accent }]}>
                      <Feather name={item.icon} size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.featureTitle, { color: colors.foreground }]}>{item.text}</Text>
                      <Text style={[styles.featureDetail, { color: colors.mutedForeground }]}>{item.detail}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 24 }]} onPress={next} testID="get-started-btn">
                <Text style={styles.primaryBtnText}>Let's get started</Text>
                <Feather name="arrow-right" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {step === 5 && (
            <View>
              <Text style={[styles.label, { color: colors.primary }]}>Optional: Remove one more thing</Text>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Already invoicing with FreshBooks or Xero?
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground, marginTop: 6, marginBottom: 16 }]}>
                Connect to skip manually uploading invoices. Everything else is automatic.
              </Text>
              <View style={[styles.infoBanner, { backgroundColor: colors.accent, borderColor: "#BAE6FD" }]}>
                <Feather name="info" size={14} color={colors.accentForeground} />
                <Text style={[styles.infoText, { color: colors.accentForeground }]}>
                  Your email is used to send follow-ups. Clients reply directly to you.
                </Text>
              </View>
              <View style={{ gap: 10, marginTop: 12 }}>
                {INTEGRATIONS.map((integ) => {
                  const isConnected = connectedIntegrations.has(integ.name);
                  return (
                    <View
                      key={integ.name}
                      style={[styles.integRow, { borderColor: isConnected ? colors.primary : colors.border, backgroundColor: isConnected ? colors.accent : colors.muted }]}
                    >
                      <View style={[styles.integIcon, { backgroundColor: integ.color }]}>
                        <Text style={styles.integInitial}>{integ.initial}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.integName, { color: colors.foreground }]}>{integ.name}</Text>
                        <Text style={[styles.integDesc, { color: colors.mutedForeground }]}>{integ.desc}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleIntegration(integ.name)}
                        style={[styles.connectBtn, { borderColor: isConnected ? colors.destructive : colors.primary }]}
                      >
                        <Text style={[styles.connectBtnText, { color: isConnected ? colors.destructive : colors.primary }]}>
                          {isConnected ? "Disconnect" : "Connect"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
              {connectedIntegrations.size > 0 && (
                <View style={[styles.successBanner, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]}>
                  <Feather name="check" size={14} color="#16A34A" />
                  <Text style={[styles.successText, { color: "#16A34A" }]}>
                    {connectedIntegrations.size === 1 ? `${Array.from(connectedIntegrations)[0]} connected` : `${connectedIntegrations.size} tools connected`}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]} onPress={next} testID="integrations-continue-btn">
                <Text style={styles.primaryBtnText}>{connectedIntegrations.size > 0 ? "Continue" : "Skip for now"}</Text>
                <Feather name="arrow-right" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {step === 6 && (
            <View style={{ alignItems: "center", paddingVertical: 12 }}>
              <View style={[styles.finishIcon, { backgroundColor: colors.accent }]}>
                <Feather name="check-circle" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.finishTitle, { color: colors.foreground }]}>That's the whole thing.</Text>
              <Text style={[styles.finishTitle, { color: colors.primary }]}>You handle the invoicing. We handle the rest.</Text>
              <Text style={[styles.body, { color: colors.mutedForeground, textAlign: "center", marginTop: 16, marginBottom: 28 }]}>
                Your inbox just got a lot quieter. Add your first invoice and let us worry about the follow-ups.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.dark, width: "100%" }]}
                onPress={finish}
                testID="go-to-dashboard-btn"
              >
                <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
                <Feather name="arrow-right" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MultiSelectStep({
  config,
  selected,
  onToggle,
  onNext,
  canGo,
  customText,
  setCustomText,
  colors,
}: {
  config: typeof Q0;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onNext: () => void;
  canGo: boolean;
  customText: string;
  setCustomText: (text: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View>
      <Text style={[styles.label, { color: colors.primary }]}>{config.label}</Text>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{config.question}</Text>
      <Text style={[styles.body, { color: colors.mutedForeground, marginBottom: 16 }]}>{config.sub}</Text>

      <View style={{ gap: 10 }}>
        {config.options.map((o) => {
          const active = selected.has(o.id);
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => onToggle(o.id)}
              style={[styles.optionCard, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.accent : colors.muted }]}
              testID={`option-${o.id}`}
            >
              <View style={[styles.checkbox, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : "transparent" }]}>
                {active && <Feather name="check" size={11} color="#FFFFFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: active ? colors.accentForeground : colors.foreground }]}>{o.label}</Text>
                <Text style={[styles.optionDetail, { color: active ? colors.accentForeground : colors.mutedForeground }]}>{o.detail}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.customInputWrapper, { borderColor: customText.trim().length > 0 ? colors.primary : colors.border, backgroundColor: colors.muted }]}>
        <Feather name="edit-2" size={13} color={customText.trim().length > 0 ? colors.primary : colors.mutedForeground} style={{ marginTop: 1 }} />
        <TextInput
          value={customText}
          onChangeText={setCustomText}
          placeholder={config.placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.customInput, { color: colors.foreground }]}
          multiline
        />
      </View>

      {(selected.size > 0 || customText.trim().length > 0) && (
        <View style={[styles.selectedCount, { backgroundColor: colors.muted }]}>
          <Feather name="check-square" size={12} color={colors.primary} />
          <Text style={[styles.selectedCountText, { color: colors.primary }]}>
            {selected.size + (customText.trim().length > 0 ? 1 : 0)} selected
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: canGo ? colors.primary : colors.muted, marginTop: 20 }]}
        onPress={onNext}
        disabled={!canGo}
        testID="thats-me-btn"
      >
        <Text style={[styles.primaryBtnText, { color: canGo ? "#FFF" : colors.mutedForeground }]}>
          {selected.size + (customText.trim().length > 0 ? 1 : 0) > 1 ? "That's me — all of it" : "That's me"}
        </Text>
        <Feather name="arrow-right" size={16} color={canGo ? "#FFF" : colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 30, marginBottom: 6 },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  optionCard: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, marginTop: 1, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  optionDetail: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  customInputWrapper: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1.5, borderRadius: 14, padding: 14, marginTop: 10 },
  customInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, minHeight: 36 },
  selectedCount: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, marginTop: 10 },
  selectedCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14 },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  pill: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14 },
  pillText: { fontSize: 12, fontFamily: "Inter_500Medium", fontStyle: "italic" },
  empathyText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 16 },
  darkBox: { borderRadius: 14, padding: 20, marginBottom: 16 },
  darkBoxLine1: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 28 },
  darkBoxLine2: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#7DD3FC", lineHeight: 28, marginTop: 4 },
  featureItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  featureIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  featureTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  featureDetail: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, padding: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  integRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  integIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  integInitial: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  integName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  integDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  connectBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexShrink: 0 },
  connectBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 12, borderWidth: 1, marginTop: 10 },
  successText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  finishIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  finishTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 34, marginBottom: 2 },
});
