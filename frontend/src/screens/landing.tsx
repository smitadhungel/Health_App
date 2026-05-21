import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Pressable,
  Platform,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeartPulse, ChevronRight, Clock, MessageCircle } from 'lucide-react-native';

const FIRST_LAUNCH_KEY = 'medicare_has_launched';

export default function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
      navigation.replace('Login');
    } catch (e) {
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}
      >
        <View style={styles.topSection}>
          {/* Icon */}
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
            <View style={styles.iconContainer}>
              <HeartPulse size={55} color="#10B981" strokeWidth={2.3} />
            </View>
          </Animated.View>

          <Text style={styles.appName}>Medicare</Text>

          <Text style={styles.headline}>
            Healthcare, Reimagined
          </Text>

          <Text style={styles.subheadline}>
            Book instant appointments, chat with AI assistant, and manage your complete health journey.
          </Text>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Clock size={20} color="#10B981" />
              <Text style={styles.featureText}>Fast Appointments</Text>
            </View>
            <View style={styles.feature}>
              <MessageCircle size={20} color="#10B981" />
              <Text style={styles.featureText}>AI Health Assistant</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.bottomSection}>
          <Pressable style={styles.ctaButton} onPress={handleGetStarted}>
            <Text style={styles.ctaText}>Get Started Free</Text>
            <ChevronRight size={24} color="#FFFFFF" strokeWidth={3} />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>
              Already a member? <Text style={styles.loginBold}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  topSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headline: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2937',
    lineHeight: 42,
  },
  subheadline: {
    fontSize: 16.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 50,
  },
  feature: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  bottomSection: {
    width: '100%',
  },
  ctaButton: {
    backgroundColor: '#064E3B',
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#064E3B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#6B7280',
  },
  loginBold: {
    color: '#10B981',
    fontWeight: '600',
  },
});