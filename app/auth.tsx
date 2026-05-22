// app/auth.tsx — Legacy route, redirects to main
import { Redirect } from 'expo-router';

export default function AuthRedirect() {
  return <Redirect href="/main" />;
}
