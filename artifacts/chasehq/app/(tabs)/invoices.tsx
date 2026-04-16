import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { INVOICES, formatUSD, type Invoice, type InvoiceStatus } from "@/lib/data";

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string }> = {
  Escalated: { bg: "#FEE2E2", text: "#DC2626" },
  Overdue: { bg: "#FEF3C7", text: "#D97706" },
  "Follow-up": { bg: "#FEF9C3", text: "#A16207" },
  Upcoming: { bg: "#DBEAFE", text: "#2563EB" },
  Paid: { bg: "#DCFCE7", text: "#16A34A" },
};

type FilterTab = "all" | "overdue" | "upcoming" | "paid";

function getFiltered(invoices: Invoice[], tab: FilterTab, query: string) {
  let list = invoices;
  if (tab === "overdue") list = list.filter((i) => i.status === "Escalated" || i.status === "Overdue" || i.status === "Follow-up");
  else if (tab === "upcoming") list = list.filter((i) => i.status === "Upcoming");
  else if (tab === "paid") list = list.filter((i) => i.status === "Paid");
  if (query.trim()) {
    const q = query.toLowerCase();
    list = list.filter((i) => i.id.toLowerCase().includes(q) || i.client.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }
  return list;
}

function getTabCount(tab: FilterTab) {
  if (tab === "all") return INVOICES.length;
  if (tab === "overdue") return INVOICES.filter((i) => ["Escalated", "Overdue", "Follow-up"].includes(i.status)).length;
  if (tab === "upcoming") return INVOICES.filter((i) => i.status === "Upcoming").length;
  if (tab === "paid") return INVOICES.filter((i) => i.status === "Paid").length;
  return 0;
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "upcoming", label: "Upcoming" },
  { id: "paid", label: "Paid" },
];

export default function InvoicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => getFiltered(INVOICES, activeTab, query), [activeTab, query]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Invoices</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Manage and track all your client invoices</Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.dark }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowNew(true);
          }}
          testID="new-invoice-btn"
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search invoices..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          testID="search-input"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = getTabCount(tab.id);
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, { borderBottomColor: isActive ? colors.primary : "transparent" }]}
              testID={`tab-${tab.id}`}
            >
              <Text style={[styles.tabText, { color: isActive ? colors.foreground : colors.mutedForeground }]}>
                {tab.label}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.dark : colors.muted }]}>
                <Text style={[styles.tabBadgeText, { color: isActive ? "#FFF" : colors.mutedForeground }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEnabled={filtered.length > 0}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.invoiceRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderTopWidth: index === 0 ? 1 : 0,
              },
            ]}
            onPress={() => router.push({ pathname: "/invoice/[id]", params: { id: item.id } })}
            testID={`invoice-row-${item.id}`}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.invoiceRowTop}>
                <Text style={[styles.invoiceClient, { color: colors.foreground }]}>{item.client}</Text>
                <Text style={[styles.invoiceId, { color: colors.mutedForeground }]}>{item.id}</Text>
              </View>
              <Text style={[styles.invoiceDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
              <View style={styles.invoiceRowBottom}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_STYLE[item.status].bg }]}>
                  <Text style={[styles.statusText, { color: STATUS_STYLE[item.status].text }]}>{item.status}</Text>
                </View>
                <Text style={[styles.invoiceDue, { color: colors.mutedForeground }]}>{item.dueDate}</Text>
                {item.daysPastDue > 0 && (
                  <View style={styles.overduePill}>
                    <Text style={styles.overdueText}>+{item.daysPastDue}d</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.invoiceRight}>
              <Text style={[styles.invoiceAmount, { color: colors.foreground }]}>{formatUSD(item.amount)}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No invoices found</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {query ? `No results for "${query}"` : "Try a different filter"}
            </Text>
          </View>
        }
      />

      <NewInvoiceModal visible={showNew} onClose={() => setShowNew(false)} colors={colors} />
    </View>
  );
}

function NewInvoiceModal({ visible, onClose, colors }: { visible: boolean; onClose: () => void; colors: ReturnType<typeof useColors> }) {
  const insets = useSafeAreaInsets();
  const [client, setClient] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  function handleCreate() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClient(""); setEmail(""); setDescription(""); setAmount(""); setDueDate("");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Invoice</Text>
          <TouchableOpacity onPress={onClose} testID="close-modal-btn">
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Client name</Text>
            <TextInput
              value={client}
              onChangeText={setClient}
              placeholder="Apex Digital"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
            />
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Client email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="billing@client.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
            />
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Brand identity & logo system"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
            />
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="$4,800"
              keyboardType="numeric"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
            />
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Due date</Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="May 30, 2024"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
            />
          </View>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.dark }]}
            onPress={handleCreate}
            testID="create-invoice-btn"
          >
            <Text style={styles.createBtnText}>Create Invoice</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, paddingBottom: 14 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  newBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  tabs: { paddingHorizontal: 16, gap: 4, marginBottom: 10 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2 },
  tabText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tabBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  invoiceRowTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  invoiceClient: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  invoiceId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  invoiceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6 },
  invoiceRowBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  invoiceDue: { fontSize: 11, fontFamily: "Inter_400Regular" },
  overduePill: { borderRadius: 4, backgroundColor: "#FEE2E2", paddingHorizontal: 5, paddingVertical: 1 },
  overdueText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#DC2626" },
  invoiceRight: { alignItems: "flex-end", gap: 4 },
  invoiceAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  createBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  createBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
