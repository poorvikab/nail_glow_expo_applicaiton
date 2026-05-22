// app/index.tsx  – entry point
// Always plays the HomeScreen splash animation.
// HomeScreen reads auth state and navigates accordingly after the animation:
//   • Logged in  → /main
//   • No session → /onboarding

import React from 'react';
import HomeScreen from '../src/screens/HomeScreen';

export default function IndexRoute() {
  // Always render the splash animation — HomeScreen handles the routing.
  return <HomeScreen />;
}
