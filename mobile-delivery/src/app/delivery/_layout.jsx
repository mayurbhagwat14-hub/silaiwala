import React from 'react';
import { Stack } from 'expo-router';

export default function DeliveryStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' }, animation: 'none' }} />;
}
