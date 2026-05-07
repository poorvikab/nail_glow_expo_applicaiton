import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ResultScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Result Screen – Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDE8EF' },
  text: { fontSize: 18, color: '#C2185B', fontWeight: '600' },
});
