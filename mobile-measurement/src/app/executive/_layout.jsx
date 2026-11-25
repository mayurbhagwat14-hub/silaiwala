import React from 'react';
import { Stack } from 'expo-router';

export default function ExecutiveStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' }, animation: 'none' }} />;
}
