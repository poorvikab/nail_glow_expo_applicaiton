import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="main" />
        <Stack.Screen name="studio" />
      </Stack>
      <StatusBar style="dark" backgroundColor="#FDE8EF" />
    </>
  );
}
