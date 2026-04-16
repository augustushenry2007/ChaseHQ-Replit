import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

type SectionKey = "profile" | "notifications" | "schedule" | "integrations" | null;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { profile, notifications, schedule, integrations, updateProfile, updateNotifications, updateSchedule, toggleIntegration, signOut, restartOnboarding } = useApp();

  const [openSection, setOpenSection] = useState<SectionKey>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function toggleSection(key: SectionKey) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenSection((prev) => (prev === key ? null : key));
  }

  async function handleSignOut() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === "web") {
      await signOut();
      router.replace("/auth");
    } else {
      Alert.alert("Sign out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/auth");
          },
        },
      ]);
    }
  }

  async function handleRestartOnboarding() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await restartOnboarding();
    router.replace("/onboarding");
  }

  const connectedIntegrations = integrations.filter((i) => i.connected);
  const unconnectedIntegrations = integrations.filter((i) => !i.connected);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Settings</Text>

      <View style={styles.sections}>
        <CollapsibleSection
          title="Profile"
          subtitle={`${profile.name} · ${profile.email}`}
          isOpen={openSection === "profile"}
          onToggle={() => toggleSection("profile")}
          colors={colors}
        >
          <ProfileSection profile={profile} updateProfile={updateProfile} colors={colors} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Notifications & Chasing"
          subtitle="Email alerts and auto-follow-up settings"
          isOpen={openSection === "notifications"}
          onToggle={() => toggleSection("notifications")}
          colors={colors}
        >
          <NotificationsSection notifications={notifications} updateNotifications={updateNotifications} colors={colors} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Follow-Up Schedule"
          subtitle="Customize when each follow-up fires"
          isOpen={openSection === "schedule"}
          onToggle={() => toggleSection("schedule")}
          colors={colors}
        >
          <ScheduleSection schedule={schedule} updateSchedule={updateSchedule} colors={colors} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Integrations"
          subtitle={connectedIntegrations.length > 0 ? `${connectedIntegrations.length} active connection${connectedIntegrations.length > 1 ? "s" : ""}` : "Connect your invoicing tools"}
          isOpen={openSection === "integrations"}
          onToggle={() => toggleSection("integrations")}
          colors={colors}
        >
          <View style={{ marginHorizontal: -16, marginBottom: -16 }}>
            {connectedIntegrations.map((integ, i) => (
              <IntegrationRow
                key={integ.id}
                integration={integ}
                onToggle={() => toggleIntegration(integ.id)}
                colors={colors}
                showBorder={i < connectedIntegrations.length - 1 || unconnectedIntegrations.length > 0}
              />
            ))}
            {unconnectedIntegrations.length > 0 && (
              <View>
                <Text style={[styles.addToolLabel, { color: colors.mutedForeground, borderTopColor: connectedIntegrations.length > 0 ? colors.border : "transparent" }]}>
                  ADD ANOTHER TOOL
                </Text>
                {unconnectedIntegrations.map((integ, i) => (
                  <IntegrationRow
                    key={integ.id}
                    integration={integ}
                    onToggle={() => toggleIntegration(integ.id)}
                    colors={colors}
                    showBorder={i < unconnectedIntegrations.length - 1}
                  />
                ))}
              </View>
            )}
          </View>
        </CollapsibleSection>
      </View>

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.bottomAction} onPress={handleRestartOnboarding} testID="restart-onboarding-btn">
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
          <Text style={[styles.bottomActionText, { color: colors.mutedForeground }]}>Restart onboarding</Text>
        </TouchableOpacity>
        <View style={[styles.bottomDot, { backgroundColor: colors.mutedForeground }]} />
        <TouchableOpacity style={styles.bottomAction} onPress={handleSignOut} testID="sign-out-btn">
          <Feather name="log-out" size={14} color={colors.mutedForeground} />
          <Text style={[styles.bottomActionText, { color: colors.mutedForeground }]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
  colors,
}: {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.collapseCard, { backgroundColor: colors.card, borderColor: isOpen ? colors.primary : colors.border }]}>
      <TouchableOpacity onPress={onToggle} style={styles.collapseHeader} testID={`section-${title}`}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
      {isOpen && (
        <View style={[styles.collapseBody, { borderTopColor: colors.border }]}>
          {children}
        </View>
      )}
    </View>
  );
}

function ProfileSection({
  profile,
  updateProfile,
  colors,
}: {
  profile: { name: string; email: string; paymentDetails: string };
  updateProfile: (p: { name: string; email: string; paymentDetails: string }) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [paymentDetails, setPaymentDetails] = useState(profile.paymentDetails);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({ name, email, paymentDetails });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Display name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <View>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <View>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Payment details</Text>
        <TextInput
          value={paymentDetails}
          onChangeText={setPaymentDetails}
          multiline
          numberOfLines={2}
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground, minHeight: 60 }]}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? "#16A34A" : colors.primary }]}
          onPress={handleSave}
          testID="profile-save-btn"
        >
          <Text style={styles.saveBtnText}>{saved ? "Saved" : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NotificationsSection({
  notifications,
  updateNotifications,
  colors,
}: {
  notifications: { emailNotifications: boolean; autoChase: boolean; defaultTone: "Polite" | "Friendly" | "Firm" | "Urgent" };
  updateNotifications: (n: { emailNotifications: boolean; autoChase: boolean; defaultTone: "Polite" | "Friendly" | "Firm" | "Urgent" }) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [emailNotifs, setEmailNotifs] = useState(notifications.emailNotifications);
  const [autoChase, setAutoChase] = useState(notifications.autoChase);
  const [tone, setTone] = useState<"Polite" | "Friendly" | "Firm" | "Urgent">(notifications.defaultTone);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateNotifications({ emailNotifications: emailNotifs, autoChase, defaultTone: tone });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const TONES: Array<"Polite" | "Friendly" | "Firm" | "Urgent"> = ["Polite", "Friendly", "Firm", "Urgent"];

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Email notifications</Text>
          <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>Get notified when clients reply or pay</Text>
        </View>
        <Switch
          value={emailNotifs}
          onValueChange={setEmailNotifs}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
          testID="email-notifs-switch"
        />
      </View>
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Auto-chase</Text>
          <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>Automatically send follow-ups on schedule</Text>
        </View>
        <Switch
          value={autoChase}
          onValueChange={setAutoChase}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
          testID="auto-chase-switch"
        />
      </View>
      <View>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Default tone</Text>
        <View style={styles.toneRow}>
          {TONES.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTone(t)}
              style={[
                styles.toneBtn,
                { borderColor: tone === t ? colors.primary : colors.border, backgroundColor: tone === t ? colors.primary : "transparent" },
              ]}
              testID={`tone-${t}`}
            >
              <Text style={[styles.toneBtnText, { color: tone === t ? "#FFFFFF" : colors.foreground }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? "#16A34A" : colors.primary }]}
          onPress={handleSave}
          testID="notifications-save-btn"
        >
          <Text style={styles.saveBtnText}>{saved ? "Saved" : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface ScheduleRow {
  id: number;
  day: number;
  action: string;
  status: "sent" | "reminder-1" | "reminder-2" | "checkpoint";
}

const SCHEDULE_PILL: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  sent: { label: "Invoice sent", dot: "#64748B", bg: "#F1F5F9", text: "#64748B" },
  "reminder-1": { label: "Friendly reminder", dot: "#0EA5E9", bg: "#E0F2FE", text: "#0369A1" },
  "reminder-2": { label: "Firm reminder", dot: "#B83232", bg: "#FDEDED", text: "#B83232" },
  checkpoint: { label: "Approval needed", dot: "#F59E0B", bg: "#FEF3C7", text: "#92400E" },
};

function ScheduleSection({
  schedule,
  updateSchedule,
  colors,
}: {
  schedule: ScheduleRow[];
  updateSchedule: (s: ScheduleRow[]) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [rows, setRows] = useState<ScheduleRow[]>(schedule);
  const [saved, setSaved] = useState(false);
  let nextId = 100;

  function addRow() {
    const lastDay = rows.length > 0 ? rows[rows.length - 1].day : 0;
    setRows((prev) => [...prev, { id: ++nextId, day: lastDay + 7, action: "Custom follow-up", status: "reminder-1" }]);
  }

  function removeRow(id: number) {
    if (rows.length <= 2) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSchedule(rows);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const sorted = [...rows].sort((a, b) => a.day - b.day);

  return (
    <View>
      <View style={[styles.scheduleTable, { borderColor: colors.border }]}>
        <View style={[styles.scheduleHeader, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
          <Text style={[styles.scheduleHeaderText, { color: colors.mutedForeground, width: 70 }]}>DAY</Text>
          <Text style={[styles.scheduleHeaderText, { color: colors.mutedForeground, flex: 1 }]}>ACTION</Text>
          <Text style={[styles.scheduleHeaderText, { color: colors.mutedForeground }]}>STATUS</Text>
        </View>
        {sorted.map((row, i) => {
          const pill = SCHEDULE_PILL[row.status];
          return (
            <View
              key={row.id}
              style={[styles.scheduleRow, { borderBottomColor: colors.border, borderBottomWidth: i < sorted.length - 1 ? 1 : 0 }]}
            >
              <View style={styles.dayCell}>
                <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>Day</Text>
                <Text style={[styles.dayNumber, { color: colors.foreground }]}>{row.day}</Text>
              </View>
              <Text style={[styles.scheduleAction, { color: colors.foreground }]}>{row.action}</Text>
              <View style={[styles.schedulePill, { backgroundColor: pill.bg }]}>
                <View style={[styles.schedulePillDot, { backgroundColor: pill.dot }]} />
                <Text style={[styles.schedulePillText, { color: pill.text }]} numberOfLines={1}>{pill.label}</Text>
              </View>
              <TouchableOpacity onPress={() => removeRow(row.id)} style={{ paddingLeft: 8 }}>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
      <TouchableOpacity style={styles.addStep} onPress={addRow} testID="add-step-btn">
        <Feather name="plus" size={14} color={colors.mutedForeground} />
        <Text style={[styles.addStepText, { color: colors.mutedForeground }]}>Add step</Text>
      </TouchableOpacity>
      <View style={{ alignItems: "flex-end" }}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? "#16A34A" : colors.primary }]}
          onPress={handleSave}
          testID="schedule-save-btn"
        >
          <Text style={styles.saveBtnText}>{saved ? "Saved" : "Save Schedule"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function IntegrationRow({
  integration,
  onToggle,
  colors,
  showBorder,
}: {
  integration: { id: string; name: string; description: string; color: string; initial: string; connected: boolean; lastSynced?: string };
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
  showBorder: boolean;
}) {
  return (
    <View style={[styles.integRow, { borderBottomColor: colors.border, borderBottomWidth: showBorder ? 1 : 0 }]}>
      <View style={[styles.integIcon, { backgroundColor: integration.color }]}>
        <Text style={styles.integInitial}>{integration.initial}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.integNameRow}>
          <Text style={[styles.integName, { color: colors.foreground }]}>{integration.name}</Text>
          {integration.connected && (
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          )}
        </View>
        <Text style={[styles.integDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
          {integration.connected && integration.lastSynced
            ? `Sync invoices automatically when m... · Last synced ${integration.lastSynced}`
            : integration.description}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.integBtn,
          { borderColor: integration.connected ? colors.destructive : colors.primary },
        ]}
        testID={`integration-toggle-${integration.id}`}
      >
        <Text style={[styles.integBtnText, { color: integration.connected ? colors.destructive : colors.primary }]}>
          {integration.connected ? "Disconnect" : "Connect"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", paddingHorizontal: 16, marginBottom: 20 },
  sections: { paddingHorizontal: 16, gap: 12 },
  collapseCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  collapseHeader: { flexDirection: "row", alignItems: "center", padding: 16 },
  collapseBody: { padding: 16, borderTopWidth: 1 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  integCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  integHeader: { padding: 16, paddingBottom: 12 },
  addToolLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  integRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  integIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  integInitial: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  integNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  integName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  connectedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E6F5F1", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  connectedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#0D7A5F" },
  connectedText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#0D7A5F" },
  integDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  integBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexShrink: 0 },
  integBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bottomActions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 24, marginBottom: 8 },
  bottomAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  bottomActionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bottomDot: { width: 3, height: 3, borderRadius: 2 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  saveBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  toneRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  toneBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  toneBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scheduleTable: { borderWidth: 1, borderRadius: 10, overflow: "hidden", marginBottom: 12 },
  scheduleHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  scheduleHeaderText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  scheduleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  dayCell: { flexDirection: "row", alignItems: "baseline", gap: 3, width: 70 },
  dayLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  dayNumber: { fontSize: 16, fontFamily: "Inter_700Bold" },
  scheduleAction: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  schedulePill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  schedulePillDot: { width: 5, height: 5, borderRadius: 3 },
  schedulePillText: { fontSize: 10, fontFamily: "Inter_500Medium", maxWidth: 90 },
  addStep: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, marginBottom: 12 },
  addStepText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
