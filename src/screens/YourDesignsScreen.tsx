import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { fetchDesigns, type SavedDesign } from '../lib/fetchDesigns';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

// ── Tokens (matching TryOnScreen / MainScreen) ────────────────────────────────
const BG       = '#FDE8EF';
const ROSE     = '#B5445A';
const ROSE_MID = '#C45A70';
const ROSE_DIM = '#9B6B78';
const DARK     = '#2A1010';
const WHITE    = '#FFFFFF';
const GLASS    = 'rgba(255,255,255,0.80)';
const BORDER   = 'rgba(181,68,90,0.18)';

// ── Layout ────────────────────────────────────────────────────────────────────
const H_PAD   = 20;
const GRID_GAP = 12;
const CARD_W  = (width - H_PAD * 2 - GRID_GAP) / 2;

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function YourDesignsScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [designs, setDesigns]       = useState<SavedDesign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const loadDesigns = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const data = await fetchDesigns(session.user.id);
      setDesigns(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not load your designs.');
    }
  }, [session?.user?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadDesigns();
      setLoading(false);
    })();
  }, [loadDesigns]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDesigns();
    setRefreshing(false);
  };

  const handleUnHeart = async (design: SavedDesign) => {
    // 1. Optimistically remove from state
    setDesigns((prev) => prev.filter((d) => d.id !== design.id));

    try {
      // 2. Delete from database designs table
      const { error: dbError } = await supabase.from('designs').delete().eq('id', design.id);
      if (dbError) throw dbError;

      // 3. Delete from storage bucket
      const url = design.image_url;
      const bucketPath = url.split('/designs/').pop();
      if (bucketPath) {
        await supabase.storage.from('designs').remove([bucketPath]);
      }
    } catch (err: any) {
      // Revert state if operation fails
      setDesigns((prev) => [...prev, design].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      Alert.alert('Error', err.message ?? 'Could not remove design from database.');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Pair items into rows for the 2-col grid
  const pairs: SavedDesign[][] = [];
  for (let i = 0; i < designs.length; i += 2) {
    pairs.push(designs.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <Animated.View entering={FadeInDown.duration(380)} style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>✦  Your Designs</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ROSE_MID} />
          <Text style={styles.loadingText}>Loading your designs…</Text>
        </View>
      ) : designs.length === 0 ? (
        <View style={styles.centered}>
          <Animated.View entering={ZoomIn.springify()} style={styles.emptyIconRing}>
            <Text style={styles.emptyEmoji}>💅</Text>
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(100).duration(400)} style={styles.emptyTitle}>
            No Designs Yet
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={styles.emptySub}>
            Head over to Try On and create your first stunning nail design!
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.replace('/tryon')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Start Creating  →</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ROSE_MID}
              colors={[ROSE_MID]}
            />
          }
        >
          {pairs.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {row.map((design, colIdx) => (
                <Animated.View
                  key={design.id}
                  entering={FadeInUp.delay((rowIdx * 2 + colIdx) * 60).duration(380).springify()}
                  style={styles.card}
                >
                  <View style={styles.cardImgWrap}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setExpandedImage(design.image_url)}
                      style={StyleSheet.absoluteFill}
                    >
                      <Image
                        source={{ uri: design.image_url }}
                        style={styles.cardImg}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>

                    {/* Red Heart / Un-heart Button */}
                    <TouchableOpacity
                      style={styles.heartBtn}
                      onPress={() => handleUnHeart(design)}
                      activeOpacity={0.8}
                      disabled={deleting === design.id}
                    >
                      {deleting === design.id ? (
                        <ActivityIndicator size="small" color={ROSE} />
                      ) : (
                        <Text style={styles.heartIcon}>♥</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardDate}>{formatDate(design.created_at)}</Text>
                    <View style={styles.cardBadge}>
                      <Text style={styles.cardBadgeText}>✦ Saved</Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          ))}
          {/* ── Tagline ── */}
          <Text style={styles.tagline}>CRAFT · GLOW · SHINE</Text>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── Expanded Image Modal ── */}
      <Modal
        visible={!!expandedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedImage(null)}
      >
        <TouchableWithoutFeedback onPress={() => setExpandedImage(null)}>
          <View style={styles.modalBackdrop}>
            {expandedImage && (
              <Animated.View entering={ZoomIn.duration(300).springify()} style={styles.expandedCard}>
                <Image
                  source={{ uri: expandedImage }}
                  style={styles.expandedImg}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setExpandedImage(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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

  // Header — matches TryOnScreen exactly
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: ROSE,
    lineHeight: 34,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DARK,
    letterSpacing: 0.3,
  },

  // Loading / Empty states
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: ROSE_DIM,
    fontWeight: '600',
  },
  emptyIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE4EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: BORDER,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 14,
    color: ROSE_DIM,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 280,
  },
  emptyBtn: {
    backgroundColor: ROSE_MID,
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 36,
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 7,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 0.5,
  },

  // Grid
  grid: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // Card
  card: {
    width: CARD_W,
    backgroundColor: WHITE,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardImgWrap: {
    width: '100%',
    height: CARD_W * 1.1,
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
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heartIcon: {
    fontSize: 18,
    color: '#E84E7A',
    lineHeight: 20,
  },
  cardInfo: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    color: ROSE_DIM,
    letterSpacing: 0.2,
  },
  cardBadge: {
    backgroundColor: '#FFE4EE',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: ROSE_MID,
    letterSpacing: 0.3,
  },

  // Expanded Image Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 16, 16, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedCard: {
    width: width * 0.88,
    height: height * 0.65,
    backgroundColor: WHITE,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  expandedImg: {
    width: '94%',
    height: '94%',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(42, 16, 16, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '800',
  },

  // Tagline
  tagline: {
    textAlign: 'center',
    fontSize: 11,
    color: ROSE_DIM,
    letterSpacing: 2.5,
    marginTop: 20,
    marginBottom: 12,
  },
});
