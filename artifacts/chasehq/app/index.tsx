import { Redirect } from "expo-router";
import { useApp } from "@/context/AppContext";

export default function Index() {
  const { isAuthenticated, hasCompletedOnboarding } = useApp();

  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }
  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)/dashboard" />;
}
