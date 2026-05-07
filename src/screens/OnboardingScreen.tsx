import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// ── Tokens ──────────────────────────────────────────────────────────────────
const BG         = '#FDE8EF';
const ROSE       = '#B5445A';
const ROSE_LIGHT = '#D4748A';
const ROSE_MID   = '#C45A70';
const ROSE_DIM   = '#9B6B78';
const DARK       = '#2A1010';
const GLASS_BG     = 'rgba(255,255,255,0.22)';
const GLASS_BORDER = 'rgba(255,255,255,0.55)';

// ── Slide data (each slide has its own image) ─────────────────────────────
const SLIDES = [
  {
    image:    require('../../assets/images/nail_image.png'),
    heading1: 'Design Your',
    heading2: 'Dream Nails',
    body:     'Pick colors, gems, and patterns on your real hand using our advanced AR studio.',
    badge:    'Real-time Brush',
  },
  {
    image:    require('../../assets/images/nail_image2.png'),
    heading1: 'Try On Any',
    heading2: 'Style Instantly',
    body:     'From French tips to bold ombré — see every look on your actual nails in real time.',
    badge:    'Live Preview',
  },
  {
    image:    require('../../assets/images/nail_image3.png'),
    heading1: 'Save & Share',
    heading2: 'Your Glow',
    body:     'Capture your favourite look and share it with friends or book your salon visit.',
    badge:    'One-tap Share',
  },
];

// ── Dots ─────────────────────────────────────────────────────────────────────
function PaginationDots({ index }: { index: number }) {
  return (
    <Animated.View
      entering={FadeIn.delay(500).duration(500)}
      style={styles.dotsRow}
    >
      {SLIDES.map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </Animated.View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      router.replace('/');
    }
  };

  const slide = SLIDES[activeIndex];

  // Stagger delays: shorter on slide changes (>0), longer for first entry from home
  const isFirst  = activeIndex === 0;
  const imgDelay = isFirst ? 200  : 0;
  const h1Delay  = isFirst ? 400  : 80;
  const h2Delay  = isFirst ? 500  : 160;
  const bdDelay  = isFirst ? 600  : 220;

  return (
    <SafeAreaView style={styles.root}>

      {/* ── Header (animates once on mount, stays put) ── */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(480)}
        style={styles.header}
      >
        <View style={styles.logoRow}>
          <Text style={styles.logoStar}>✦</Text>
          <Text style={styles.logoText}>NailGlow</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/')} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Image card — re-mounts on slide change via key ── */}
      <Animated.View
        key={`card-${activeIndex}`}
        entering={
          activeIndex === 0
            ? ZoomIn.delay(imgDelay).springify()
            : FadeInRight.delay(imgDelay).springify()
        }
        style={styles.imageCard}
      >
        <Image source={slide.image} style={styles.image} resizeMode="cover" />

        {/* Colour palette pill */}
        <Animated.View
          key={`pill-${activeIndex}`}
          entering={FadeInDown.delay(isFirst ? 350 : 100).springify()}
          style={styles.colorPill}
        >
          {['#F4677C', '#7BA7F5', '#FFD166'].map((c, i) => (
            <View key={i} style={[styles.colorDot, { backgroundColor: c }]} />
          ))}
        </Animated.View>

        {/* Brush badge */}
        <Animated.View
          key={`badge-${activeIndex}`}
          entering={FadeInUp.delay(isFirst ? 450 : 120).springify()}
          style={styles.brushBadge}
        >
          <Text style={styles.brushIcon}>✏️</Text>
          <Text style={styles.brushText}>{slide.badge}</Text>
        </Animated.View>
      </Animated.View>

      {/* ── Text content — re-mounts on slide change via key ── */}
      <View style={styles.copySection}>

        {/* Heading line 1 */}
        <Animated.Text
          key={`h1-${activeIndex}`}
          entering={FadeInUp.delay(h1Delay).springify()}
          style={styles.headingDark}
        >
          {slide.heading1}
        </Animated.Text>

        {/* Heading line 2 */}
        <Animated.Text
          key={`h2-${activeIndex}`}
          entering={FadeInUp.delay(h2Delay).springify()}
          style={styles.headingRose}
        >
          {slide.heading2}
        </Animated.Text>

        {/* Body */}
        <Animated.Text
          key={`bd-${activeIndex}`}
          entering={FadeInUp.delay(bdDelay).springify()}
          style={styles.body}
        >
          {slide.body}
        </Animated.Text>
      </View>

      {/* ── Dots (re-renders but no key, so the row doesn't remount) ── */}
      <PaginationDots index={activeIndex} />

      {/* ── Next button ── */}
      <Animated.View
        entering={FadeInUp.delay(isFirst ? 700 : 0).duration(400)}
        style={styles.btnWrapper}
      >
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.82}
          accessibilityRole="button"
        >
          <Text style={styles.nextText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next  ›'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const IMG_H = height * 0.40;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: Platform.OS === 'android' ? 36 : 0,
  },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical:   12,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoStar: { fontSize: 16, color: ROSE },
  logoText:  { fontSize: 17, fontWeight: '700', color: DARK, letterSpacing: 0.3 },
  skip:      { fontSize: 14, color: ROSE_MID, fontWeight: '500' },

  // Image card
  imageCard: {
    marginHorizontal: 20,
    marginTop:        20,
    borderRadius:     24,
    overflow:         'hidden',
    height:           IMG_H,
    backgroundColor:  '#D6B8C0',
    shadowColor:      ROSE,
    shadowOffset:     { width: 0, height: 8 },
    shadowOpacity:    0.2,
    shadowRadius:     20,
    elevation:        10,
  },
  image: { width: '100%', height: '100%' },

  // Glassmorphism colour pill
  colorPill: {
    position:       'absolute',
    top:            16,
    right:          16,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    backgroundColor: GLASS_BG,
    borderWidth:    1,
    borderColor:    GLASS_BORDER,
    borderRadius:   50,
    paddingHorizontal: 14,
    paddingVertical:   10,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.06,
    shadowRadius:   8,
    elevation:      3,
  },
  colorDot: { width: 22, height: 22, borderRadius: 11 },

  // Glassmorphism brush badge
  brushBadge: {
    position:      'absolute',
    bottom:        18,
    left:          16,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    backgroundColor: GLASS_BG,
    borderWidth:   1,
    borderColor:   GLASS_BORDER,
    borderRadius:  50,
    paddingHorizontal: 16,
    paddingVertical:   10,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     3,
  },
  brushIcon: { fontSize: 16 },
  brushText: { fontSize: 13, fontWeight: '600', color: DARK },

  // Copy section
  copySection: {
    flex:          1,
    marginTop:     52,
    alignItems:    'center',
    paddingHorizontal: 28,
  },
  headingDark: {
    fontSize:   34,
    fontWeight: '800',
    color:      DARK,
    textAlign:  'center',
    lineHeight: 40,
  },
  headingRose: {
    fontSize:    34,
    fontWeight:  '800',
    color:       ROSE_LIGHT,
    textAlign:   'center',
    lineHeight:  40,
    marginBottom: 16,
  },
  body: {
    fontSize:  14,
    color:     ROSE_DIM,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth:  300,
  },

  // Dots
  dotsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    marginBottom:   20,
  },
  dot:        { height: 8, borderRadius: 4 },
  dotActive:  { width: 28, backgroundColor: ROSE_MID },
  dotInactive:{ width: 8,  backgroundColor: '#E8A0B5' },

  // Button
  btnWrapper: {
    paddingHorizontal: 24,
    paddingBottom:     32,
  },
  nextBtn: {
    backgroundColor: ROSE_MID,
    borderRadius:    50,
    paddingVertical: 18,
    alignItems:      'center',
    shadowColor:     ROSE,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.30,
    shadowRadius:    14,
    elevation:       8,
  },
  nextText: {
    color:       '#fff',
    fontSize:    16,
    fontWeight:  '700',
    letterSpacing: 0.5,
  },
});
