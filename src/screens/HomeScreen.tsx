import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useCallback } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const BG = '#FDE8EF';
const ROSE = '#B5445A';
const ROSE_LIGHT = '#D4748A';
const ROSE_MID = '#C45A70';

// ── Timing ────────────────────────────────────────────────────────────────
const NAIL_START = 300;   // "Naıl" slides up
const GLOW_START = 750;   // "Glow" slides up  ← sound also fires here
const TAGLINE_START = 1250;  // tagline fades in
const DOT_START = 1800;  // dot on "i" pops in

// ── Audio ─────────────────────────────────────────────────────────────────
// NOTE: Web browsers block audio autoplay without a user gesture.
// Sound will work correctly on iPhone — ignore it during web testing.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SOUND_ASSET = require('../../assets/images/videoplayback.mp3');

async function preloadNative(ref: React.MutableRefObject<Audio.Sound | null>) {
  if (Platform.OS === 'web') return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
    const { sound } = await Audio.Sound.createAsync(SOUND_ASSET, {
      shouldPlay: false,
      volume: 1.0,
    });
    ref.current = sound;
  } catch (_) { }
}

async function triggerSound(ref: React.MutableRefObject<Audio.Sound | null>) {
  if (Platform.OS === 'web') {
    try {
      // Web: browser Audio API (blocked by autoplay policy without user gesture)
      const uri = typeof SOUND_ASSET === 'string'
        ? SOUND_ASSET
        : (SOUND_ASSET as { uri?: string }).uri ?? '';
      if (!uri) return;
      const el = new (window as any).Audio(uri) as HTMLAudioElement;
      el.volume = 1.0;
      await el.play();
    } catch (_) { }
    return;
  }
  try {
    if (ref.current) {
      await ref.current.setPositionAsync(0);
      await ref.current.playAsync();
    }
  } catch (_) { }
}

// ── GlowStar ──────────────────────────────────────────────────────────────
// Renders a ✦ glyph with a warm cream text-shadow glow (matches the
// CSS  filter: drop-shadow(0 0 10px #fffdef)  reference).
function GlowStar({
  x, y, size, entryDelay,
}: {
  x: number; y: number; size: number; entryDelay: number;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Pop in with spring overshoot
    scale.value = withDelay(
      entryDelay,
      withSpring(1, { damping: 6, stiffness: 200 }),
    );
    opacity.value = withDelay(
      entryDelay,
      withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) }),
    );

    // Continuous gentle pulse after appearing
    const pulseDelay = entryDelay + 400;
    opacity.value = withDelay(
      pulseDelay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 900 }),
          withTiming(1, { duration: 900 }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const s = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[
        {
          position: 'absolute',
          top: y - size / 2,
          left: x - size / 2,
          fontSize: size,
          color: '#E8739A',          // soft rose for the ✦ body
          // Warm cream glow — mirrors drop-shadow(0 0 10px #fffdef)
          textShadowColor: '#FFFDE7',
          textShadowRadius: 10,
          textShadowOffset: { width: 0, height: 0 },
        },
        s,
      ]}
    >
      {'\u2726' /* ✦ BLACK FOUR POINTED STAR */}
    </Animated.Text>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router   = useRouter();
  const soundRef = useRef<Audio.Sound | null>(null);
  const { session, isLoading } = useAuth();

  // Ref to capture latest auth state at navigation time
  const authRef = useRef({ session, isLoading });
  useEffect(() => {
    authRef.current = { session, isLoading };
  }, [session, isLoading]);

  /**
   * Called after the splash animation finishes.
   * If auth is still loading, wait for it; then route based on session.
   */
  const navigateAfterAnimation = useCallback(() => {
    const go = () => {
      if (authRef.current.session) {
        router.replace('/main');
      } else {
        router.replace('/onboarding');
      }
    };

    if (!authRef.current.isLoading) {
      go();
      return;
    }

    // Auth still loading — poll briefly (max ~3 s) then decide
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      if (!authRef.current.isLoading || elapsed >= 3000) {
        clearInterval(interval);
        go();
      }
    }, 100);
  }, [router]);

  // Word animations
  const nailY = useSharedValue(48);
  const nailOp = useSharedValue(0);
  const glowY = useSharedValue(48);
  const glowOp = useSharedValue(0);

  // Tagline
  const tagOp = useSharedValue(0);
  const tagY = useSharedValue(10);

  // Dot reveal: 0 = dotless "ı" visible, 1 = real "i" dot visible
  const dotReveal = useSharedValue(0);

  // Stars
  const starsReveal = useSharedValue(0);
  const starsStyle = useAnimatedStyle(() => ({
    opacity: withTiming(starsReveal.value, { duration: 300 }),
  }));

  // Dissolve-out: content floats up and fades before navigating
  const dissolveOp    = useSharedValue(1);
  const dissolveScale = useSharedValue(1);
  const dissolveStyle = useAnimatedStyle(() => ({
    opacity:   dissolveOp.value,
    transform: [{ scale: dissolveScale.value }],
  }));

  useEffect(() => {
    // Preload audio on native
    preloadNative(soundRef);

    // "Naıl" word rises
    nailY.value = withDelay(NAIL_START, withSpring(0, { damping: 18, stiffness: 110 }));
    nailOp.value = withDelay(NAIL_START, withTiming(1, { duration: 380, easing: Easing.out(Easing.ease) }));

    // "Glow" word rises — sound starts here so it lands on the dot reveal
    glowY.value = withDelay(GLOW_START, withSpring(0, { damping: 18, stiffness: 110 }));
    glowOp.value = withDelay(GLOW_START, withTiming(1, { duration: 380, easing: Easing.out(Easing.ease) }));

    const soundTimer = setTimeout(() => triggerSound(soundRef), GLOW_START);

    // Tagline fades in
    tagOp.value = withDelay(TAGLINE_START, withTiming(1, { duration: 500 }));
    tagY.value = withDelay(TAGLINE_START, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));

    // Dot + stars pop in together
    const t = setTimeout(() => {
      dotReveal.value   = withSpring(1, { damping: 8, stiffness: 220 });
      starsReveal.value = 1;
    }, DOT_START);

    // Dissolve-out: starts 2.5 s after the dot appears
    const DISSOLVE_START = DOT_START + 2500;
    const dissolveTimer = setTimeout(() => {
      dissolveOp.value    = withTiming(0,    { duration: 1100, easing: Easing.in(Easing.ease) });
      dissolveScale.value = withTiming(0.92, { duration: 1100, easing: Easing.in(Easing.ease) });
      starsReveal.value   = withTiming(0,    { duration: 700  });
    }, DISSOLVE_START);

    // Navigate 1.15 s after dissolve starts (just as it finishes)
    const navTimer = setTimeout(() => {
      // navigateAfterAnimation will be called, which checks auth
      navigateAfterAnimation();
    }, DISSOLVE_START + 1150);

    return () => {
      clearTimeout(soundTimer);
      clearTimeout(t);
      clearTimeout(dissolveTimer);
      clearTimeout(navTimer);
      soundRef.current?.unloadAsync();
    };
  }, []);

  const nailWordStyle = useAnimatedStyle(() => ({
    opacity: nailOp.value,
    transform: [{ translateY: nailY.value }],
  }));

  const glowWordStyle = useAnimatedStyle(() => ({
    opacity: glowOp.value,
    transform: [{ translateY: glowY.value }],
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOp.value,
    transform: [{ translateY: tagY.value }],
  }));

  // Cross-fade: dotless fades out, dotted fades in
  const dotlessStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dotReveal.value, [0, 1], [1, 0]),
  }));

  const dottedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dotReveal.value, [0, 1], [0, 1]),
  }));

  // Star layout — centred on the logo block
  const cx = width / 2;
  const cy = height / 2;
  const stars = [
    { x: cx - 125, y: cy - 55, size: 18, d: 0 },
    { x: cx + 118, y: cy - 60, size: 14, d: 60 },
    { x: cx - 155, y: cy + 10, size: 12, d: 120 },
    { x: cx + 150, y: cy + 5, size: 16, d: 40 },
    { x: cx - 15, y: cy - 85, size: 13, d: 90 },
    { x: cx + 20, y: cy + 85, size: 11, d: 150 },
    { x: cx - 80, y: cy + 70, size: 10, d: 200 },
    { x: cx + 85, y: cy + 65, size: 12, d: 170 },
  ];

  return (
    <View style={styles.root}>

      {/* ── Star layer — hidden until DOT_START ── */}
      <Animated.View style={[StyleSheet.absoluteFill, starsStyle]} pointerEvents="none">
        {stars.map((s, i) => (
          <GlowStar key={i} x={s.x} y={s.y} size={s.size} entryDelay={s.d} />
        ))}
      </Animated.View>

      {/* ── All logo content wrapped in dissolve container ── */}
      <Animated.View style={[styles.logoBlock, dissolveStyle]}>

        {/* ── Word row ── */}
        <View style={styles.wordRow}>

          {/* "Nail" — dotless ı until reveal */}
          <Animated.View style={nailWordStyle}>
            {/*
              Stack two Text nodes absolutely. The dotted "Nail" defines the layout
              width; the dotless "Naıl" is absolute on top, fading out at reveal.
              "ı" (U+0131) has identical advance width to "i" in every major font.
            */}
            <View>
              {/* Dotted version — defines size, initially invisible */}
              <Animated.Text style={[styles.wordNail, dottedStyle]}>
                Nail
              </Animated.Text>
              {/* Dotless version — sits on top, fades out on reveal */}
              <Animated.Text
                style={[styles.wordNail, dotlessStyle, styles.absoluteOverlay]}
              >
                {'Na\u0131l' /* Naıl — U+0131 is dotless i */}
              </Animated.Text>
            </View>
          </Animated.View>

          {/* Space between words */}
          <View style={{ width: 14 }} />

          {/* "Glow" */}
          <Animated.View style={glowWordStyle}>
            <Animated.Text style={styles.wordGlow}>Glow</Animated.Text>
          </Animated.View>
        </View>

        {/* ── Tagline ── */}
        <Animated.Text style={[styles.tagline, tagStyle]}>
          CRAFT · GLOW · SHINE
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBlock: {
    alignItems: 'center',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  wordNail: {
    fontSize: 62,
    fontWeight: '800',
    color: ROSE,
    letterSpacing: 2,
    includeFontPadding: false,
  },
  wordGlow: {
    fontSize: 62,
    fontWeight: '300',
    color: ROSE_LIGHT,
    letterSpacing: 2,
    includeFontPadding: false,
  },
  tagline: {
    marginTop: 18,
    fontSize: 11.5,
    letterSpacing: 5,
    color: ROSE_MID,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  absoluteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
