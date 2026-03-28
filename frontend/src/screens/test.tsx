import React from 'react';
import { View, Text } from 'react-native';

export default function TestScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {/* Apply the color here */}
      <Text style={{ color: 'red', fontSize: 20 }}>Test Screen</Text>
    </View>
  );
}