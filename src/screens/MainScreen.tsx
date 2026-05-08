import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// ── Tokens ────────────────────────────────────────────────────────────────────
const BG = '#FDE8EF';
const ROSE = '#B5445A';
const ROSE_LIGHT = '#D4748A';
const ROSE_MID = '#C45A70';
const ROSE_DIM = '#9B6B78';
const DARK = '#2A1010';
const GLASS_BG = 'rgba(255,255,255,0.25)';
const GLASS_BORDER = 'rgba(255,255,255,0.60)';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ── Section heights ────────────────────────────────────────────────────────────
const HERO_H = height;
const SECTION_H = height * 0.90;

// ── ScrollReveal ──────────────────────────────────────────────────────────────
// One-way latch: once scrollY crosses `start`, plays a fade+slide animation
// and STAYS visible — content never disappears on scroll-up.
function ScrollReveal({
  scrollY,
  start,
  children,
  fromY = 32,
  delay = 0,
}: {
  scrollY: Animated.SharedValue<number>;
  start: number;
  children: React.ReactNode;
  fromY?: number;
  delay?: number;
}) {
  const progress    = useSharedValue(0);
  const hasTriggered = useSharedValue(0);

  // Runs entirely on the UI thread — no JS bridge round-trip
  useDerivedValue(() => {
    if (scrollY.value >= start && hasTriggered.value === 0) {
      hasTriggered.value = 1;
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }),
      );
    }
  });

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [fromY, 0]) }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ── Feature chip ──────────────────────────────────────────────────────────────
function Chip({ label, emoji }: { label: string; emoji: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

// ── Wave divider ──────────────────────────────────────────────────────────────
function WaveDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerStar}>✦</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Design', emoji: '✏️', active: true },
  { label: 'Learn', emoji: '📖', active: false },
  { label: 'Gallery', emoji: '⊞', active: false },
  { label: 'Profile', emoji: '👤', active: false },
];

// ── Bottom Nav Bar ────────────────────────────────────────────────────────────
function BottomNav({
  scrollY,
  router,
}: {
  scrollY: Animated.SharedValue<number>;
  router: ReturnType<typeof useRouter>;
}) {
  const navStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [60, 160], [0, 1], 'clamp');
    return {
      opacity: progress,
      transform: [{ translateY: interpolate(progress, [0, 1], [40, 0]) }],
    };
  });

  return (
    <Animated.View style={[styles.navBar, navStyle]} pointerEvents="box-none">
      <View style={styles.navInner}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.navItem}
            activeOpacity={0.75}
            onPress={() => item.active && router.replace('/modal')}
          >
            {item.active ? (
              <View style={styles.navActiveCircle}>
                <Text style={styles.navActiveEmoji}>{item.emoji}</Text>
              </View>
            ) : (
              <Text style={styles.navInactiveEmoji}>{item.emoji}</Text>
            )}
            <Text style={[styles.navLabel, item.active && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function MainScreen() {
  const router = useRouter();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  // Parallax hero image
  const heroImgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * 0.4 }],
  }));

  // Floating top header: fades in as user scrolls
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [0, 80], [-20, 0], 'clamp') }],
  }));

  // ── Trigger scroll positions ────────────────────────────────────────────────
  // Fire animations BEFORE the section reaches the viewport top so content is
  // fully visible the moment the user lands on it. Pre-trigger by ~40% of height.
  const SEC2_START = HERO_H * 0.60;       // starts animating while hero is 60% scrolled
  const SEC3_START = HERO_H + SECTION_H * 0.60;  // same for section 3

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Sticky floating header (appears on scroll) ── */}
      <Animated.View style={[styles.floatingHeader, headerStyle]} pointerEvents="box-none">
        <View style={styles.floatingHeaderInner}>
          <Text style={styles.floatingLogo}>✦ NailGlow</Text>
          <TouchableOpacity
            style={styles.ctaSmall}
            onPress={() => router.replace('/modal')}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaSmallText}>Try Now</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Scroll body ── */}
      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={styles.scrollContent}
      >

        {/* ═══════════════════════════════════════════════════
            SECTION 1 — Hero: full-screen parallax + headline
        ══════════════════════════════════════════════════════ */}
        <View style={[styles.section, { height: HERO_H }]}>

          {/* Parallax image */}
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
            <Animated.Image
              source={require('../../assets/images/nail_image.png')}
              style={[styles.heroImage, heroImgStyle]}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay} />
          </View>

          {/* Top badge */}
          <Animated.View
            entering={ZoomIn.delay(300).springify()}
            style={styles.heroBadgeWrap}
          >
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>✨  Nail Glow  ✨</Text>
            </View>
          </Animated.View>

          {/* Copy block */}
          <View style={styles.heroCopy}>
            <Animated.Text
              entering={FadeInUp.delay(400).duration(600).springify()}
              style={styles.heroEye}
            >
              Your nails.
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(560).duration(600).springify()}
              style={styles.heroHeadline}
            >
              Reimagined.
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(700).duration(600)}
              style={styles.heroSub}
            >
              Design, try on, and share stunning nail art — all from your phone.
            </Animated.Text>

            <Animated.View
              entering={FadeInUp.delay(850).duration(500)}
              style={styles.chipRow}
            >
              <Chip label="AR Try-On" emoji="🪄" />
              <Chip label="100+ Styles" emoji="💅" />
              <Chip label="Share Looks" emoji="✈️" />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(1000).duration(500)}>
              <TouchableOpacity
                style={styles.heroCta}
                activeOpacity={0.85}
                onPress={() => router.replace('/modal')}
              >
                <Text style={styles.heroCtaText}>Start Creating  →</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Scroll hint */}
          <Animated.Text
            entering={FadeInDown.delay(1200).duration(600)}
            style={styles.scrollHint}
          >
            Scroll to explore ↓
          </Animated.Text>
        </View>

        {/* ═══════════════════════════════════════════════════
            SECTION 2 — How It Works (nail_image2)
        ══════════════════════════════════════════════════════ */}
        <View style={[styles.section, { minHeight: SECTION_H, backgroundColor: BG, paddingBottom: 48, paddingTop: 20 }]}>

          <ScrollReveal scrollY={scrollY} start={SEC2_START} delay={0}>
            <WaveDivider />
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} start={SEC2_START} delay={80}>
            <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} start={SEC2_START} delay={160}>
            <Text style={styles.sectionHeading}>
              Try On Any{'\n'}
              <Text style={styles.sectionHeadingAccent}>Style Instantly</Text>
            </Text>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} start={SEC2_START} delay={240} fromY={50}>
            <View style={styles.galleryCard}>
              <Image
                source={require('../../assets/images/nail_image2.png')}
                style={styles.galleryImage}
                resizeMode="cover"
              />
              <View style={styles.galleryPill}>
                <Text style={styles.galleryPillText}>Live AR Preview</Text>
              </View>
            </View>
          </ScrollReveal>

          {[
            { num: '01', title: 'Choose a style', desc: 'Browse 100+ curated nail designs — French, ombré, glitter and beyond.' },
            { num: '02', title: 'Try it on live', desc: 'Point your camera at your hand. See the look instantly with our AR engine.' },
            { num: '03', title: 'Save & share', desc: 'Capture your fave look and share it or book your salon in one tap.' },
          ].map((step, i) => (
            <ScrollReveal
              key={step.num}
              scrollY={scrollY}
              start={SEC2_START}
              delay={260 + i * 80}
            >
              <View style={styles.stepRow}>
                <View style={styles.stepNumWrap}>
                  <Text style={styles.stepNum}>{step.num}</Text>
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            </ScrollReveal>
          ))}
        </View>

        {/* ═══════════════════════════════════════════════════
            SECTION 3 — Share / Social Proof (nail_image3)
        ══════════════════════════════════════════════════════ */}
        <View style={[styles.section, { minHeight: SECTION_H, backgroundColor: '#FAD4E2', paddingBottom: 45}]}>

          <ScrollReveal scrollY={scrollY} start={SEC3_START} delay={0}>
            <WaveDivider />
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} start={SEC3_START} delay={80}>
            <Text style={styles.sectionLabel}>YOUR GLOW MOMENT</Text>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} start={SEC3_START} delay={160}>
            <Text style={styles.sectionHeading}>
              Save &amp;{'\n'}
              <Text style={styles.sectionHeadingAccent}>Share Your Look</Text>
            </Text>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} start={SEC3_START} delay={240} fromY={50}>
            <View style={styles.shareCard}>
              <Image
                source={require('../../assets/images/nail_image3.png')}
                style={styles.shareImage}
                resizeMode="cover"
              />
              <View style={styles.shareOverlay}>
                <Text style={styles.shareOverlayTitle}>Ready to Glow? 💅</Text>
                <Text style={styles.shareOverlaySub}>Capture · Share · Inspire</Text>
              </View>
            </View>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} start={SEC3_START} delay={360}>
            <View style={styles.statsRow}>
              {[
                { val: '50K+', label: 'Looks Shared' },
                { val: '100+', label: 'Nail Styles' },
                { val: '4.9 ★', label: 'Avg Rating' },
              ].map((s) => (
                <View key={s.label} style={styles.statBox}>
                  <Text style={styles.statVal}>{s.val}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} start={SEC3_START} delay={440} fromY={24}>
            <View style={styles.testimonialCard}>
              <Text style={styles.testimonialQuote}>
                "I tried NailGlow before my wedding and got the exact look I wanted. Absolutely magical! 💕"
              </Text>
              <Text style={styles.testimonialName}>— Priya S., Mumbai</Text>
            </View>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} start={SEC3_START} delay={520}>
            <Text style={styles.footer}>CRAFT · GLOW · SHINE</Text>
          </ScrollReveal>
        </View>

      </AnimatedScrollView>

      {/* ── Bottom Navigation Bar (appears on scroll) ── */}
      <BottomNav scrollY={scrollY} router={router} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {},

  section: {
    width,
    overflow: 'hidden',
    paddingTop: Platform.OS === 'android' ? 48 : 56,
    paddingHorizontal: 24,
  },

  // ── Floating top header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'android' ? 36 : 52,
    paddingBottom: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(253,232,239,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(181,68,90,0.10)',
  },
  floatingHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingLogo: {
    fontSize: 17,
    fontWeight: '700',
    color: DARK,
    letterSpacing: 0.3,
  },
  ctaSmall: {
    backgroundColor: ROSE_MID,
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  ctaSmallText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Hero
  heroImage: {
    width,
    height: HERO_H * 1.15,
    top: -HERO_H * 0.075,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42,16,16,0.38)',
  },
  heroBadgeWrap: {
    alignItems: 'center',
    marginTop: 8,
    zIndex: 2,
  },
  heroBadge: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heroCopy: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    right: 24,
    zIndex: 2,
  },
  heroEye: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroHeadline: {
    fontSize: 54,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 58,
    marginBottom: 14,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  heroCta: {
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 14,
    elevation: 8,
  },
  heroCtaText: {
    color: ROSE,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scrollHint: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    letterSpacing: 1.5,
    zIndex: 2,
  },

  // ── Section shared
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(181,68,90,0.18)',
  },
  dividerStar: {
    fontSize: 14,
    color: ROSE_LIGHT,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 4,
    color: ROSE_MID,
    textAlign: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 36,
    fontWeight: '900',
    color: DARK,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 28,
  },
  sectionHeadingAccent: { color: ROSE_LIGHT },

  // ── Gallery card
  galleryCard: {
    borderRadius: 28,
    overflow: 'hidden',
    height: height * 0.38,
    marginBottom: 32,
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  galleryImage: { width: '100%', height: '100%' },
  galleryPill: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  galleryPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 22,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.80)',
  },
  stepNumWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ROSE_MID,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: { color: '#fff', fontSize: 13, fontWeight: '800' },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: ROSE_DIM, lineHeight: 20 },

  // ── Share card
  shareCard: {
    borderRadius: 28,
    overflow: 'hidden',
    height: height * 0.42,
    marginBottom: 30,
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  shareImage: { width: '100%', height: '100%' },
  shareOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(42,16,16,0.52)',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  shareOverlayTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  shareOverlaySub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
  },

  // ── Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.80)',
  },
  statBox: { alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900', color: ROSE, marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', color: ROSE_DIM, letterSpacing: 0.5 },

  // ── Testimonial
  testimonialCard: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    marginBottom: 28,
  },
  testimonialQuote: {
    fontSize: 15,
    color: DARK,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 12,
  },
  testimonialName: {
    fontSize: 12,
    fontWeight: '700',
    color: ROSE_MID,
    letterSpacing: 0.3,
  },

  // ── Footer
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: ROSE_DIM,
    letterSpacing: 2.5,
    marginBottom: 84,   // clears the floating nav bar + gives breathing room
    marginTop: 8,
  },

  // ── Bottom Navigation Bar
  navBar: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 25 : 28,
    left: 24,
    right: 24,
    zIndex: 200,
    // Ensure touches pass through when invisible
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: '#B5445A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  navItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 2,
  },
  navActiveCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ROSE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 5,
  },
  navActiveEmoji: { fontSize: 16 },
  navInactiveEmoji: { fontSize: 18, color: ROSE_LIGHT },
  navLabel: { fontSize: 9, fontWeight: '600', color: ROSE_DIM, letterSpacing: 0.3 },
  navLabelActive: { color: ROSE, fontWeight: '800' },
});
