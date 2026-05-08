import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// ── Tokens ─────────────────────────────────────────────────────────────────────
const BG         = '#FDE8EF';
const ROSE       = '#B5445A';
const ROSE_LIGHT = '#D4748A';
const ROSE_MID   = '#C45A70';
const DARK       = '#2A1010';
const GLASS_BG   = 'rgba(255,255,255,0.30)';
const GLASS_BDR  = 'rgba(255,255,255,0.65)';
const SURFACE    = '#FFFFFF';
const BORDER     = '#F0D8E0';

// ── Design images (1–8 from assets) ────────────────────────────────────────────
const DESIGNS = [
  { id: '1', label: 'Soft Rose',      image: require('../../assets/images/1.png') },
  { id: '2', label: 'Gilded Nude',    image: require('../../assets/images/2.png') },
  { id: '3', label: 'Berry Glam',     image: require('../../assets/images/3.png') },
  { id: '4', label: 'Crystal Tips',   image: require('../../assets/images/4.png') },
  { id: '5', label: 'Ombré Blush',    image: require('../../assets/images/5.png') },
  { id: '6', label: 'French Luxe',    image: require('../../assets/images/6.png') },
  { id: '7', label: 'Chrome Swirl',   image: require('../../assets/images/7.png') },
  { id: '8', label: 'Velvet Noir',    image: require('../../assets/images/8.png') },
];

// ── Colour swatches ─────────────────────────────────────────────────────────────
const COLOURS = [
  { id: 'c1', hex: '#F4C2C2', label: 'Blush'    },
  { id: 'c2', hex: '#E84E7A', label: 'Rose'     },
  { id: 'c3', hex: '#B5445A', label: 'Berry'    },
  { id: 'c4', hex: '#7BA7F5', label: 'Sky'      },
  { id: 'c5', hex: '#FFD166', label: 'Honey'    },
  { id: 'c6', hex: '#A8E6CF', label: 'Mint'     },
  { id: 'c7', hex: '#C9B1FF', label: 'Lavender' },
  { id: 'c8', hex: '#2A1010', label: 'Noir'     },
  { id: 'c9', hex: '#FFFFFF', label: 'Pearl'    },
  { id: 'ca', hex: '#D4AF37', label: 'Gold'     },
];

// ── Design thumbnail ────────────────────────────────────────────────────────────
function DesignThumb({
  item,
  selected,
  onPress,
}: {
  item: typeof DESIGNS[0];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.thumb, selected && styles.thumbSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={item.image} style={styles.thumbImg} resizeMode="cover" />
      {selected && <View style={styles.thumbCheck}><Text style={styles.thumbCheckIcon}>✓</Text></View>}
      <Text style={[styles.thumbLabel, selected && styles.thumbLabelSelected]} numberOfLines={1}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function TryOnScreen() {
  const router = useRouter();
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);
  const [selectedColour, setSelectedColour] = useState<string | null>(null);

  // ── Image picker ─────────────────────────────────────────────────────────────
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length > 0) {
      setUploadedUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length > 0) {
      setUploadedUri(result.assets[0].uri);
    }
  };

  const hasImage = !!uploadedUri;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/main')} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR Try-On</Text>
        <View style={styles.headerStar}>
          <Text style={styles.starGlyph}>✦</Text>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces
      >

        {/* ═══════════════════════════════════════════════
            UPLOAD ZONE
        ════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(120).duration(450).springify()}>
          {!hasImage ? (
            /* ── Empty state ── */
            <View style={styles.uploadCard}>
              {/* Dashed border ring */}
              <View style={styles.uploadInner}>
                <Animated.Text entering={ZoomIn.delay(300).springify()} style={styles.uploadEmoji}>
                  💅
                </Animated.Text>
                <Text style={styles.uploadTitle}>Upload Your Hand Photo</Text>
                <Text style={styles.uploadSub}>
                  Take or select a clear photo of your hand so we can apply nail designs in real time.
                </Text>

                <View style={styles.uploadBtnRow}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto} activeOpacity={0.85}>
                    <Text style={styles.uploadBtnIcon}>📷</Text>
                    <Text style={styles.uploadBtnText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.uploadBtn, styles.uploadBtnSecondary]} onPress={pickFromGallery} activeOpacity={0.85}>
                    <Text style={styles.uploadBtnIcon}>🖼️</Text>
                    <Text style={[styles.uploadBtnText, styles.uploadBtnTextSecondary]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* ── Uploaded image preview ── */
            <Animated.View entering={FadeIn.duration(400)} style={styles.previewCard}>
              <Image
                source={{ uri: uploadedUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              {/* Overlay badge */}
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>✦  Your Hand</Text>
              </View>
              {/* Change photo */}
              <TouchableOpacity style={styles.changeBtn} onPress={() => setUploadedUri(null)} activeOpacity={0.8}>
                <Text style={styles.changeBtnText}>Change Photo</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* ═══════════════════════════════════════════════
            OPTIONS (shown after upload)
        ════════════════════════════════════════════════ */}
        {hasImage && (
          <Animated.View entering={FadeInUp.delay(80).duration(420).springify()}>

            {/* ── Colour Picker ── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Pick a Colour</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colourRow}>
                {COLOURS.map((col) => {
                  const active = selectedColour === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      onPress={() => setSelectedColour(col.id)}
                      activeOpacity={0.8}
                      style={styles.swatchWrap}
                    >
                      <View style={[
                        styles.swatch,
                        { backgroundColor: col.hex },
                        active && styles.swatchActive,
                        col.hex === '#FFFFFF' && styles.swatchWhiteBorder,
                      ]} />
                      <Text style={[styles.swatchLabel, active && styles.swatchLabelActive]}>
                        {col.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Design Picker ── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Choose a Design</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.designRow}>
                {DESIGNS.map((d) => (
                  <DesignThumb
                    key={d.id}
                    item={d}
                    selected={selectedDesign === d.id}
                    onPress={() => setSelectedDesign(d.id)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* ── Apply CTA ── */}
            <TouchableOpacity
              style={[
                styles.applyCta,
                (!selectedDesign && !selectedColour) && styles.applyCtaDisabled,
              ]}
              activeOpacity={0.85}
              disabled={!selectedDesign && !selectedColour}
            >
              <Text style={styles.applyCtaText}>✦  Apply to Nails</Text>
            </TouchableOpacity>

          </Animated.View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const UPLOAD_H = height * 0.42;
const PREVIEW_H = height * 0.38;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  backIcon: { fontSize: 18, color: ROSE, fontWeight: '700' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK,
    letterSpacing: 0.3,
  },
  headerStar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGlyph: { fontSize: 20, color: ROSE_LIGHT },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Upload card
  uploadCard: {
    height: UPLOAD_H,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: ROSE_LIGHT,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.60)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  uploadInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  uploadEmoji: { fontSize: 52, marginBottom: 4 },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
    textAlign: 'center',
  },
  uploadSub: {
    fontSize: 13,
    color: ROSE_LIGHT,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  uploadBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ROSE_MID,
    borderRadius: 50,
    paddingHorizontal: 22,
    paddingVertical: 13,
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  uploadBtnSecondary: {
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowOpacity: 0.08,
  },
  uploadBtnIcon: { fontSize: 18 },
  uploadBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  uploadBtnTextSecondary: { color: ROSE_MID },

  // Preview
  previewCard: {
    height: PREVIEW_H,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 10,
  },
  previewImage: { width: '100%', height: '100%' },
  previewBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BDR,
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  previewBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  changeBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  changeBtnText: { fontSize: 12, fontWeight: '700', color: ROSE_MID },

  // Sections
  sectionBlock: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK,
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  // Colour swatches
  colourRow: {
    gap: 10,
    paddingBottom: 4,
    paddingRight: 4,
  },
  swatchWrap: { alignItems: 'center', gap: 5 },
  swatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  swatchActive: {
    borderColor: ROSE,
    transform: [{ scale: 1.15 }],
  },
  swatchWhiteBorder: {
    borderColor: BORDER,
  },
  swatchLabel: { fontSize: 9.5, color: ROSE_LIGHT, fontWeight: '500' },
  swatchLabelActive: { color: ROSE, fontWeight: '800' },

  // Design thumbs
  designRow: {
    gap: 12,
    paddingBottom: 4,
    paddingRight: 4,
  },
  thumb: {
    width: 90,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: SURFACE,
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbSelected: {
    borderColor: ROSE_MID,
  },
  thumbImg: { width: '100%', height: 90 },
  thumbCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ROSE_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCheckIcon: { color: '#fff', fontSize: 12, fontWeight: '800' },
  thumbLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: DARK,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  thumbLabelSelected: { color: ROSE_MID, fontWeight: '800' },

  // Apply CTA
  applyCta: {
    backgroundColor: ROSE,
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  applyCtaDisabled: {
    backgroundColor: '#D4B0BA',
    shadowOpacity: 0.10,
  },
  applyCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
