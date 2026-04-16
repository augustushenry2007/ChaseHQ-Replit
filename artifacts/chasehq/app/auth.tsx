import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { signIn } = useApp();
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    await signIn();
    setLoading(false);
    router.replace("/onboarding");
  }

  async function handleExplore() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signIn();
    router.replace("/onboarding");
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 20, paddingBottom: bottomPad + 20, backgroundColor: colors.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
          <Feather name="check" size={22} color="#FFFFFF" />
        </View>
        <Text style={[styles.brand, { color: colors.foreground }]}>ChaseHQ</Text>

        <View style={styles.heroSection}>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Get paid without the awkwardness.
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            ChaseHQ handles every follow-up — so you never have to worry about what to say, when to say it, or how.
          </Text>
        </View>

        <View style={styles.features}>
          {[
            { icon: "zap" as const, text: "Automated follow-up sequences" },
            { icon: "shield" as const, text: "Your voice, your brand — always" },
            { icon: "trending-up" as const, text: "Get paid faster, stress less" },
          ].map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.accent }]}>
                <Feather name={f.icon} size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={handleSignIn}
            activeOpacity={0.8}
            disabled={loading}
            testID="google-signin-btn"
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleLetter}>G</Text>
            </View>
            <Text style={[styles.googleText, { color: colors.foreground }]}>
              {loading ? "Signing in…" : "Continue with Google"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.exploreBtn, { borderColor: colors.border }]}
            onPress={handleExplore}
            activeOpacity={0.7}
            testID="explore-btn"
          >
            <Text style={[styles.exploreText, { color: colors.mutedForeground }]}>
              Explore without signing in
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          By continuing, you agree to our Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
  },
  inner: {
    paddingHorizontal: 28,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  brand: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 32,
  },
  heroSection: {
    marginBottom: 28,
  },
  headline: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  features: {
    marginBottom: 32,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleLetter: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  googleText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  exploreBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  exploreText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  legal: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
