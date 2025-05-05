import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 실제 이미지 대신 아이콘 사용
export const AppleWatchIcon = () => (
  <View style={{ width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }}>
    <Ionicons name="watch-outline" size={40} color="#000" />
  </View>
);

export const GalaxyWatchIcon = () => (
  <View style={{ width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }}>
    <Ionicons name="watch-outline" size={40} color="#1428A0" />
  </View>
);

export const MiBandIcon = () => (
  <View style={{ width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }}>
    <Ionicons name="watch-outline" size={40} color="#FF6700" />
  </View>
); 