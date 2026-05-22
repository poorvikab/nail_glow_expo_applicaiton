import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
  returnedResults,
} from 'reanimated-color-picker';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn, runOnJS } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { saveDesignToSupabase } from '../lib/saveDesign';

const { width } = Dimensions.get('window');

// ── Tokens ─────────────────────────────────────────────────────────────────────
const BG       = '#FDE8EF';
const ROSE     = '#B5445A';
const ROSE_MID = '#C45A70';
const ROSE_DIM = '#9B6B78';
const DARK     = '#2A1010';
const WHITE    = '#FFFFFF';
const GLASS    = 'rgba(255,255,255,0.80)';
const BORDER   = 'rgba(181,68,90,0.18)';

// ── Preset colours (9 items → 5 top row, 4 + "+" bottom row) ─────────────────
const PRESET_COLORS = [
  '#F4A7B9', '#E84E7A', '#C45A70', '#2A1010', '#A8D8A8',
  '#7BA7F5', '#FFD166', '#FFFFFF', '#C084FC',
];

// ── Preset patterns (9 items → 5 top row, 4 + "+" bottom row) ────────────────
// Top row: 1,2,3,4,9  |  Bottom row: 5,6,7,10,+
const PRESET_PATTERNS = [
  { key: '1',  src: require('../../assets/images/1.png') },
  { key: '2',  src: require('../../assets/images/2.png') },
  { key: '3',  src: require('../../assets/images/3.png') },
  { key: '4',  src: require('../../assets/images/4.png') },
  { key: '9',  src: require('../../assets/images/9.png') },
  { key: '5',  src: require('../../assets/images/5.png') },
  { key: '6',  src: require('../../assets/images/6.png') },
  { key: '7',  src: require('../../assets/images/7.png') },
  { key: '10', src: require('../../assets/images/10.png') },
];

const SWATCH = 52;
const GAP    = 10;

// ── Hex helpers ────────────────────────────────────────────────────────────────
function normalizeHex(raw: string): string | null {
  const c = raw.replace(/[^0-9a-fA-F]/g, '');
  if (c.length === 3) return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`;
  if (c.length === 6) return `#${c}`;
  return null;
}

// ── Color Picker Modal ─────────────────────────────────────────────────────────
function ColorPickerModal({
  visible, onClose, onSelect,
}: { visible: boolean; onClose: () => void; onSelect: (hex: string) => void }) {
  const [pickedHex, setPickedHex] = useState('#E84E7A');
  const [hexInput,  setHexInput]  = useState('E84E7A');
  const [hexValid,  setHexValid]  = useState(true);

  // JS-thread state updater
  const applyColor = useCallback((hex6: string) => {
    setPickedHex(hex6);
    setHexInput(hex6.replace('#', ''));
    setHexValid(true);
  }, []);

  // Worklet — runs on UI thread; runOnJS bridges back to JS thread
  const handleColorChange = useCallback((result: returnedResults) => {
    'worklet';
    const hex6 = result.hex.slice(0, 7);
    runOnJS(applyColor)(hex6);
  }, [applyColor]);

  const handleHexInput = (text: string) => {
    const cleaned = text.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    setHexInput(cleaned);
    const parsed = normalizeHex(cleaned);
    if (parsed) { setPickedHex(parsed); setHexValid(true); }
    else { setHexValid(cleaned.length === 0); }
  };

  const handleApply = () => { onSelect(pickedHex); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={mst.backdrop} />
      </TouchableWithoutFeedback>

      <View style={mst.sheet}>
        <View style={mst.handle} />
        <Text style={mst.title}>Pick a Colour</Text>

        <ColorPicker
          value={pickedHex}
          onComplete={handleColorChange}
          style={{ width: '100%', gap: 10 }}
        >
          <Panel1 style={mst.panel} />
          <HueSlider style={mst.slider} />
          <Preview style={mst.preview} hideInitialColor />
        </ColorPicker>

        <View style={mst.hexRow}>
          <View style={[mst.swatch, { backgroundColor: pickedHex }]} />
          <View style={[mst.hexWrap, !hexValid && { borderColor: '#E84E4E' }]}>
            <Text style={mst.hash}>#</Text>
            <TextInput
              style={mst.hexInput}
              value={hexInput}
              onChangeText={handleHexInput}
              placeholder="e.g. FF6B9D"
              placeholderTextColor="#C4A0AC"
              autoCapitalize="characters"
              maxLength={6}
            />
          </View>
        </View>

        <View style={mst.btnRow}>
          <TouchableOpacity style={mst.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={mst.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={mst.addBtn} onPress={handleApply} activeOpacity={0.8}>
            <Text style={mst.addTxt}>Apply to Nails ✦</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function TryOnScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [handPhoto,       setHandPhoto]   = useState<string | null>(null);
  const [photoAspect,     setPhotoAspect] = useState(4 / 3);
  const [selectedColor,   setSelectedColor]   = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [customPatterns,  setCustomPatterns]  = useState<string[]>([]);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [applying,        setApplying]        = useState(false);
  const [resultPhoto,     setResultPhoto]     = useState<string | null>(null);
  const [changePhotoVisible, setChangePhotoVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (handPhoto) {
      Image.getSize(handPhoto, (w, h) => { if (h > 0) setPhotoAspect(w / h); });
      setResultPhoto(null);
    }
  }, [handPhoto]);

  // ── Core apply function: accepts explicit color/pattern so we don't rely on stale state
  const applyDesign = async (color: string | null, patternKey: string | null) => {
    if (!handPhoto) return;
    setApplying(true);
    try {
      const form = new FormData();
      const photoName = handPhoto.split('/').pop() ?? 'hand.jpg';
      const photoType = photoName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      form.append('image', { uri: handPhoto, name: photoName, type: photoType } as any);
      form.append('opacity', '0.82');

      if (patternKey) {
        const allPatterns = [
          ...PRESET_PATTERNS,
          ...customPatterns.map(uri => ({ key: `custom-${uri}`, src: { uri } })),
        ];
        const pat = allPatterns.find(p => p.key === patternKey);
        if (pat) {
          const src = pat.src as any;
          const uri = src.uri ?? Image.resolveAssetSource(src).uri;
          form.append('pattern', { uri, name: uri.split('/').pop() ?? 'pattern.png', type: 'image/png' } as any);
        }
      } else if (color) {
        form.append('color', color);
      }

      const API = `${process.env.EXPO_PUBLIC_API_URL}/apply`;
      const res = await fetch(API, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setResultPhoto(`data:image/jpeg;base64,${json.result}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not connect to backend');
    } finally {
      setApplying(false);
    }
  };

  // ── Tap a preset colour → auto-apply
  const handleSelectColor = (hex: string) => {
    setSelectedColor(hex);
    setSelectedPattern(null);
    applyDesign(hex, null);
  };

  // ── Tap a preset pattern → auto-apply
  const handleSelectPattern = (key: string) => {
    setSelectedPattern(key);
    setSelectedColor(null);
    applyDesign(null, key);
  };

  // ── Colour wheel confirm → directly apply, no palette changes
  const handleColorPickerSelect = (hex: string) => {
    setSelectedColor(hex);
    setSelectedPattern(null);
    applyDesign(hex, null);
  };

  const pickHand = async (fromCamera = false) => {
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.9 });
      if (!r.canceled) setHandPhoto(r.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.9 });
      if (!r.canceled) setHandPhoto(r.assets[0].uri);
    }
  };

  const pickPattern = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!r.canceled) {
      const uri = r.assets[0].uri;
      setCustomPatterns(p => [...p, uri]);
      const key = `custom-${uri}`;
      setSelectedPattern(key);
      setSelectedColor(null);
      applyDesign(null, key);
    }
  };

  const allPatterns = [
    ...PRESET_PATTERNS,
    ...customPatterns.map(uri => ({ key: `custom-${uri}`, src: { uri } })),
  ];

  // ── Grid helpers ─────────────────────────────────────────────────────────────
  // Colors: row1 = 5 items, row2 = 4 items + "+"
  const colorRow1 = PRESET_COLORS.slice(0, 5);
  const colorRow2 = PRESET_COLORS.slice(5); // 4 items + "+"

  // Patterns: row1 = 5 items (1,2,3,4,9), row2 = 4 items (5,6,7,10) + "+"
  const patternRow1 = allPatterns.slice(0, 5);
  const patternRow2 = allPatterns.slice(5, 9); // up to 4 items + "+"

  // ── Save result image: upload to Supabase + save to camera roll ──────────────
  const saveImage = async () => {
    if (!resultPhoto) {
      Alert.alert('Nothing to save', 'Apply a design first to get a result.');
      return;
    }
    if (!session?.user?.id) {
      Alert.alert('Not signed in', 'Please restart the app and try again.');
      return;
    }
    if (isSaving) return;
    setIsSaving(true);

    const base64 = resultPhoto.replace(/^data:image\/\w+;base64,/, '');

    try {
      // 1. Upload to Supabase Storage + insert into designs table
      await saveDesignToSupabase(base64, session.user.id);

      // 2. Also save to local gallery
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const fileUri = (FileSystem.cacheDirectory ?? '') + `nailglow_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await MediaLibrary.saveToLibraryAsync(fileUri);
      }

      Alert.alert('Saved ✓', 'Your nail design has been saved!');
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Could not save your design. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderColorCircle = (hex: string) => {
    const sel = selectedColor === hex;
    const isLight = ['#FFFFFF', '#FFD166', '#A8D8A8', '#7BA7F5', '#F5F5F5'].includes(hex);
    return (
      <View key={hex} style={[styles.ringWrap, sel && styles.ringWrapSelected]}>
        <TouchableOpacity
          style={[styles.colorCircle, { backgroundColor: hex }, hex === '#FFFFFF' && styles.colorCircleWhite]}
          onPress={() => handleSelectColor(hex)}
          activeOpacity={0.8}
        >
          {sel && !applying && <Text style={[styles.checkMark, { color: isLight ? DARK : WHITE }]}>✓</Text>}
          {sel && applying && <ActivityIndicator size="small" color={isLight ? DARK : WHITE} />}
        </TouchableOpacity>
      </View>
    );
  };

  const renderPatternCircle = (p: { key: string; src: any }) => {
    const sel = selectedPattern === p.key;
    return (
      <View key={p.key} style={[styles.ringWrap, sel && styles.ringWrapSelected]}>
        <TouchableOpacity style={styles.patternCircle} onPress={() => handleSelectPattern(p.key)} activeOpacity={0.8}>
          <Image source={p.src as any} style={styles.patternImg} resizeMode="cover" />
          {sel && (
            <View style={styles.patternOverlay}>
              {applying
                ? <ActivityIndicator size="small" color={WHITE} />
                : <Text style={styles.checkMark}>✓</Text>}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ColorPickerModal
        visible={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        onSelect={handleColorPickerSelect}
      />

      {/* ── Change Photo Sheet ── */}
      <Modal visible={changePhotoVisible} transparent animationType="fade" onRequestClose={() => setChangePhotoVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setChangePhotoVisible(false)}>
          <View style={cst.backdrop} />
        </TouchableWithoutFeedback>
        <View style={cst.card}>
          <View style={cst.handle} />
          <Text style={cst.title}>Change Photo</Text>
          <TouchableOpacity
            style={cst.option}
            activeOpacity={0.8}
            onPress={() => { setChangePhotoVisible(false); pickHand(true); }}
          >
            <Text style={cst.optionText}>Camera</Text>
          </TouchableOpacity>
          <View style={cst.divider} />
          <TouchableOpacity
            style={cst.option}
            activeOpacity={0.8}
            onPress={() => { setChangePhotoVisible(false); pickHand(false); }}
          >
            <Text style={cst.optionText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={cst.cancelBtn}
            activeOpacity={0.8}
            onPress={() => setChangePhotoVisible(false)}
          >
            <Text style={cst.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Header ── */}
      <Animated.View entering={FadeInDown.duration(380)} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/main')} activeOpacity={0.8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>✦  Try On</Text>
        {/* Global applying spinner */}
        {applying
          ? <ActivityIndicator color={ROSE} size="small" style={{ width: 40 }} />
          : <View style={{ width: 40 }} />}
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Upload / Preview ── */}
        <Animated.View entering={FadeInUp.delay(80).duration(420).springify()}>
          {!handPhoto ? (
            <View style={styles.uploadZone}>
              <View style={styles.uploadIconRing}>
                <Text style={styles.uploadEmoji}>🤳</Text>
              </View>
              <Text style={styles.uploadTitle}>Upload a photo of your hand</Text>
              <Text style={styles.uploadSub}>Take a clear photo or pick one from your gallery</Text>
              <View style={styles.uploadActions}>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => pickHand(true)} activeOpacity={0.85}>
                  <Text style={styles.uploadBtnIcon}>📷</Text>
                  <Text style={styles.uploadBtnText}>Camera</Text>
                </TouchableOpacity>
                <View style={styles.uploadDivider} />
                <TouchableOpacity style={styles.uploadBtn} onPress={() => pickHand(false)} activeOpacity={0.85}>
                  <Text style={styles.uploadBtnIcon}>🖼</Text>
                  <Text style={styles.uploadBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Animated.View entering={ZoomIn.springify()} style={[styles.previewWrap, { aspectRatio: photoAspect }]}>
              <Image
                source={{ uri: resultPhoto ?? handPhoto! }}
                style={styles.previewImg}
                resizeMode="contain"
              />
              {applying && (
                <View style={styles.applyingOverlay}>
                  <ActivityIndicator color={WHITE} size="large" />
                  <Text style={styles.applyingText}>Applying…</Text>
                </View>
              )}
              <View style={styles.previewTopRow}>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>
                    {resultPhoto ? '✦  Result' : '✦  Your Hand'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  activeOpacity={0.8}
                  onPress={() => setChangePhotoVisible(true)}
                >
                  <Text style={styles.retakeText}>Change</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* ── Colour Grid ── */}
        <Animated.View entering={FadeIn.delay(160).duration(380)} style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Colour</Text>

          {/* Row 1: 5 colours */}
          <View style={styles.gridRow}>
            {colorRow1.map(renderColorCircle)}
          </View>

          {/* Row 2: 3 colours + "+" */}
          <View style={[styles.gridRow, { marginTop: GAP }]}>
            {colorRow2.map(renderColorCircle)}
            <TouchableOpacity style={styles.plusCircle} onPress={() => setColorPickerOpen(true)} activeOpacity={0.8}>
              <Text style={styles.plusIcon}>+</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Pattern Grid ── */}
        <Animated.View entering={FadeIn.delay(240).duration(380)} style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Pattern</Text>

          {/* Row 1: 5 patterns (1,2,3,4,9) */}
          <View style={styles.gridRow}>
            {patternRow1.map(renderPatternCircle)}
          </View>

          {/* Row 2: up to 4 patterns (5,6,7,10) + "+" */}
          <View style={[styles.gridRow, { marginTop: GAP }]}>
            {patternRow2.map(renderPatternCircle)}
            <TouchableOpacity style={styles.plusCircle} onPress={pickPattern} activeOpacity={0.8}>
              <Text style={styles.plusIcon}>+</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Save Button ── */}
        {resultPhoto && (
          <Animated.View entering={FadeInUp.duration(320)} style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={saveImage}
              activeOpacity={0.87}
              disabled={isSaving}
            >
              {isSaving ? (
                <View style={styles.saveBtnInner}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.saveBtnText}>Saving…</Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>Save Design</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Tagline ── */}
        <Text style={styles.tagline}>CRAFT · GLOW · SHINE</Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Main Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingTop: Platform.OS === 'android' ? 32 : 0 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: GLASS, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 28, color: ROSE, lineHeight: 34, fontWeight: '300' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: DARK, letterSpacing: 0.3 },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  // Upload
  uploadZone: {
    backgroundColor: WHITE, borderRadius: 28,
    borderWidth: 1.8, borderColor: BORDER, borderStyle: 'dashed',
    alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, marginBottom: 28,
  },
  uploadIconRing: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFE4EE',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  uploadEmoji: { fontSize: 36 },
  uploadTitle: { fontSize: 17, fontWeight: '800', color: DARK, textAlign: 'center', marginBottom: 8 },
  uploadSub: { fontSize: 13, color: ROSE_DIM, textAlign: 'center', lineHeight: 20, maxWidth: 260, marginBottom: 28 },
  uploadActions: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FDE8EF', borderRadius: 50, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  uploadBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, paddingHorizontal: 20,
  },
  uploadDivider: { width: 1, height: 28, backgroundColor: BORDER },
  uploadBtnIcon: { fontSize: 18 },
  uploadBtnText: { fontSize: 14, fontWeight: '700', color: ROSE_MID },

  // Preview
  previewWrap: {
    borderRadius: 24, overflow: 'hidden',
    width: '100%', marginBottom: 28,
    backgroundColor: '#1a0808',
    shadowColor: ROSE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16, shadowRadius: 18, elevation: 8,
  },
  previewImg: { width: '100%', height: '100%' },
  applyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  applyingText: { color: WHITE, fontSize: 14, fontWeight: '700' },
  previewTopRow: {
    position: 'absolute', top: 14, left: 14, right: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  previewBadge: { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7 },
  previewBadgeText: { fontSize: 12, fontWeight: '700', color: ROSE, letterSpacing: 0.5 },
  retakeBtn: { backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7 },
  retakeText: { fontSize: 12, fontWeight: '700', color: WHITE },

  // Sections
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: DARK, marginBottom: 14, letterSpacing: 0.2 },

  // Grid rows (flexDirection: row, wraps naturally)
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    alignItems: 'center',
  },

  // Ring wrapper
  ringWrap: {
    borderRadius: (SWATCH + 8) / 2, padding: 3,
    borderWidth: 2.5, borderColor: 'transparent',
  },
  ringWrapSelected: { borderColor: ROSE_MID },

  colorCircle: {
    width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  colorCircleWhite: { borderWidth: 1, borderColor: BORDER },
  checkMark: { fontSize: 17, fontWeight: '900', color: WHITE },

  patternCircle: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2, overflow: 'hidden' },
  patternImg: { width: '100%', height: '100%' },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(181,68,90,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  plusCircle: {
    width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2,
    borderWidth: 2, borderColor: ROSE_MID, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE8F0',
  },
  plusIcon: { fontSize: 26, color: ROSE_MID, lineHeight: 30, fontWeight: '300' },

  // Save button
  saveWrap: { marginBottom: 12 },
  saveBtn: {
    backgroundColor: ROSE_MID, borderRadius: 50, paddingVertical: 15,
    alignItems: 'center',
    shadowColor: ROSE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 7,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: WHITE, letterSpacing: 0.6 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Tagline — matches MainScreen footer style
  tagline: {
    textAlign: 'center',
    fontSize: 11,
    color: ROSE_DIM,
    letterSpacing: 2.5,
    marginTop: 20,
    marginBottom: 12,
  },
});

// ── Modal Styles ───────────────────────────────────────────────────────────────
const mst = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(42,16,16,0.45)' },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
    paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D4748A', alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '800', color: DARK, marginBottom: 12, textAlign: 'center' },

  panel: { height: 180, borderRadius: 14 },
  slider: { height: 24, borderRadius: 12 },
  preview: { height: 36, borderRadius: 10 },

  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 14 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER },
  hexWrap: {
    flex: 1, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#FFF5F8', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11,
  },
  hash: { fontSize: 15, fontWeight: '700', color: ROSE_DIM, marginRight: 2 },
  hexInput: { flex: 1, height: 40, fontSize: 14, fontWeight: '600', color: DARK },

  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#FDE8EF', borderRadius: 50, paddingVertical: 13, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '700', color: ROSE_MID },
  addBtn: { flex: 1, backgroundColor: ROSE, borderRadius: 50, paddingVertical: 13, alignItems: 'center' },
  addTxt: { fontSize: 14, fontWeight: '700', color: WHITE },
});

// ── Change Photo Modal Styles ──────────────────────────────────────────────────
const cst = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(42,16,16,0.50)',
  },
  card: {
    backgroundColor: '#FFF0F5',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 14,
    borderTopWidth: 1.5, borderColor: 'rgba(181,68,90,0.15)',
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#D4748A', alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontSize: 15, fontWeight: '800', color: '#2A1010',
    textAlign: 'center', marginBottom: 16, letterSpacing: 0.3,
  },
  option: {
    paddingVertical: 15, alignItems: 'center',
    backgroundColor: '#FFE8F2',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(181,68,90,0.18)',
  },
  optionText: {
    fontSize: 15, fontWeight: '700', color: '#B5445A',
  },
  divider: {
    height: 10,
  },
  cancelBtn: {
    marginTop: 14, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(181,68,90,0.10)',
    borderRadius: 50,
  },
  cancelTxt: {
    fontSize: 14, fontWeight: '700', color: '#9B6B78',
  },
});
