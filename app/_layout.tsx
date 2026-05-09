import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="main" />
        <Stack.Screen name="studio" />
        <Stack.Screen name="tryon" />
      </Stack>
      <StatusBar style="dark" backgroundColor="#FDE8EF" />
    </GestureHandlerRootView>
  );
}
