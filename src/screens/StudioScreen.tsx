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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// ── Tokens ─────────────────────────────────────────────────────────────────────
const BG = '#FFFFFF';
const SURFACE = '#FFF5F8';
const PINK = '#E84E7A';
const PINK_LIGHT = '#FFE4EE';
const PINK_MID = '#D4547A';
const DARK = '#1C0B12';
const DARK_ROSE = '#3D1020';
const GRAY = '#A0909A';
const GRAY_LIGHT = '#F5F0F2';
const BORDER = '#F0E6EA';

// ── Layout ─────────────────────────────────────────────────────────────────────
const H_PAD = 20;
const GRID_GAP = 12;
const CARD_W = (width - H_PAD * 2 - GRID_GAP) / 2;
const IMG_H = CARD_W * 0.90;

// ── Data ───────────────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Minimal', 'French', 'Gel', 'Ombré', 'Glitter', 'Chrome'];

const STYLES_DATA = [
  { id: '1', name: 'Rose Quartz Swirl', image: require('../../assets/images/nail_image.png') },
  { id: '2', name: 'Gilded Flora', image: require('../../assets/images/nail_image2.png') },
  { id: '3', name: 'Celestial Chrome', image: require('../../assets/images/nail_image3.png') },
  { id: '4', name: 'Modern Plum French', image: require('../../assets/images/nail_image.png') },
  { id: '5', name: 'Aurora Ombré', image: require('../../assets/images/nail_image2.png') },
  { id: '6', name: 'Nude Luxe Tips', image: require('../../assets/images/nail_image3.png') },
  { id: '7', name: 'Crystal Clear', image: require('../../assets/images/nail_image.png') },
  { id: '8', name: 'Berry Bloom', image: require('../../assets/images/nail_image2.png') },
  { id: '9', name: 'Glazed Donut', image: require('../../assets/images/nail_image3.png') },
  { id: '10', name: 'Velvet Night', image: require('../../assets/images/nail_image.png') },
  { id: '11', name: 'Sakura Dream', image: require('../../assets/images/nail_image2.png') },
  { id: '12', name: 'Gold Dust', image: require('../../assets/images/nail_image3.png') },
];

// ── Bottom Nav ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'design', label: 'Design', emoji: '✏️' },
  { key: 'learn', label: 'Learn', emoji: '📖' },
  { key: 'gallery', label: 'Gallery', emoji: '⊞' },
  { key: 'profile', label: 'Profile', emoji: '👤' },
];

// ── NailCard ──────────────────────────────────────────────────────────────────
function NailCard({
  item,
  index,
  liked,
  onLike,
}: {
  item: typeof STYLES_DATA[0];
  index: number;
  liked: boolean;
  onLike: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).duration(380).springify()}
      style={styles.card}
    >
      {/* Image */}
      <View style={styles.cardImgWrap}>
        <Image source={item.image} style={styles.cardImg} resizeMode="cover" />

        {/* Heart button */}
        <TouchableOpacity
          style={[styles.heartBtn, liked && styles.heartBtnActive]}
          onPress={onLike}
          activeOpacity={0.8}
        >
          <Text style={[styles.heartIcon, liked && styles.heartIconActive]}>
            {liked ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <TouchableOpacity style={styles.tryBtn} activeOpacity={0.8}>
          <Text style={styles.tryBtnText}>Try On</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function StudioScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string) =>
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));

  // Pair items into rows for the 2-col grid
  const pairs: (typeof STYLES_DATA)[] = [];
  for (let i = 0; i < STYLES_DATA.length; i += 2) {
    pairs.push(STYLES_DATA.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoStar}>✦</Text>
          <Text style={styles.logoText}>NailGlow</Text>
        </View>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatar} activeOpacity={0.8}>
          <Image
            source={require('../../assets/images/profile.png')}
            style={styles.avatarImg}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Search bar ── */}
      <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.searchWrap}>
        {/* <Text style={styles.searchStar}>✦</Text> */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search nail styles..."
          placeholderTextColor={GRAY}
          value={search}
          onChangeText={setSearch}
        />
      </Animated.View>

      {/* ── Category pills ── */}
      <Animated.View entering={FadeInDown.delay(140).duration(380)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat, i) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.catPill,
                activeCategory === cat && styles.catPillActive,
              ]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.catText,
                  activeCategory === cat && styles.catTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── Grid ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        bounces
      >
        {pairs.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {row.map((item, colIdx) => (
              <NailCard
                key={item.id}
                item={item}
                index={rowIdx * 2 + colIdx}
                liked={!!liked[item.id]}
                onLike={() => toggleLike(item.id)}
              />
            ))}
          </View>
        ))}
        {/* Bottom padding so nav bar doesn't overlap last row */}
        <View style={{ height: 20 }} />
      </ScrollView>


      {/* ── Bottom Nav ── */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(400)}
        style={styles.navBar}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === 'gallery';
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              activeOpacity={0.75}
              onPress={() => {
                if (item.key === 'design') router.replace('/main');
              }}
            >
              {isActive ? (
                <View style={styles.navActiveCircle}>
                  <Text style={styles.navActiveEmoji}>{item.emoji}</Text>
                </View>
              ) : (
                <Text style={styles.navInactiveEmoji}>{item.emoji}</Text>
              )}
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
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
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoStar: {
    fontSize: 18,
    color: PINK,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: PINK,
    letterSpacing: 0.2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PINK_LIGHT,
    borderRadius: 50,
    marginHorizontal: H_PAD,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    gap: 10,
  },
  searchStar: {
    fontSize: 16,
    color: PINK,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: DARK,
    padding: 0,
  },

  // Categories
  categoryRow: {
    paddingHorizontal: H_PAD,
    gap: 10,
    paddingBottom: 16,
  },
  catPill: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: BG,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  catPillActive: {
    backgroundColor: DARK_ROSE,
    borderColor: DARK_ROSE,
  },
  catText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK,
  },
  catTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Grid
  grid: {
    paddingHorizontal: H_PAD,
    gap: GRID_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // Card
  card: {
    width: CARD_W,
    backgroundColor: BG,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#D4547A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardImgWrap: {
    width: '100%',
    height: IMG_H,
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  heartBtnActive: {
    backgroundColor: PINK,
  },
  heartIcon: {
    fontSize: 16,
    color: PINK,
    lineHeight: 18,
  },
  heartIconActive: {
    color: '#fff',
  },
  cardInfo: {
    padding: 12,
    gap: 8,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK,
    letterSpacing: 0.1,
  },
  tryBtn: {
    backgroundColor: PINK_LIGHT,
    borderRadius: 50,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: PINK_MID,
  },

  // FAB
  fabWrap: {
    position: 'absolute',
    bottom: 74,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 10,
  },
  fabIcon: { fontSize: 24 },

  // Bottom Nav
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  navItem: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
  },
  navActiveCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  navActiveEmoji: { fontSize: 18 },
  navInactiveEmoji: { fontSize: 20, color: GRAY },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: GRAY,
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: PINK,
    fontWeight: '800',
  },
});
