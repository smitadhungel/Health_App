import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeartPulse, ShieldCheck, Clock, ChevronRight, Activity } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const FIRST_LAUNCH_KEY = 'medicare_has_launched';

// Particle component for the floating background effect
const Particle = ({ delay = 0 }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const xOffset = useRef(Math.random() * width).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animValue, delay]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: xOffset,
          opacity: animValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.6, 0],
          }),
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [height, -100],
              }),
            },
          ],
        },
      ]}
    />
  );
};

export default function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Animated values
  const logoAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.sequence([
      Animated.spring(logoAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.timing(taglineAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.stagger(120, [
        Animated.spring(card1Anim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(card2Anim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(card3Anim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.spring(btnAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    // Pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
      navigation.navigate('Login');
    } catch (e) {
      navigation.navigate('Login');
    }
  };

  const fadeUp = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{
      translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }),
    }],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0fdf4" />

      {/* Floating background particles */}
      {[...Array(6)].map((_, i) => (
        <Particle key={i} delay={i * 500} />
      ))}

      {/* Logo Area (Circles removed per your request) */}
      <Animated.View style={[styles.logoArea, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.heartBg}>
            <HeartPulse size={42} color="#fff" />
          </View>
        </Animated.View>
        <Text style={styles.brandName}>Medicare</Text>
        <View style={styles.brandLine} />
        <Text style={styles.aiLabel}>Smart Healthcare</Text>
      </Animated.View>

      {/* Hero Text */}
      <Animated.View style={[styles.taglineArea, fadeUp(taglineAnim)]}>
        <Text style={styles.tagline}>
          Your health,{'\n'}
          <Text style={styles.taglineBold}>in trusted hands.</Text>
        </Text>
        <Text style={styles.taglineSub}>
          The complete digital healthcare companion powered{'\n'}by Medicare.
        </Text>
      </Animated.View>

      {/* Feature Cards with your provided Icons */}
      <View style={styles.cardsRow}>
        <Animated.View style={[styles.featureCard, { opacity: card1Anim, transform: [{ scale: card1Anim }] }]}>
          <View style={[styles.featureIconBg, { backgroundColor: '#dcfce7' }]}>
            <ShieldCheck size={22} color="#22c55e" />
          </View>
          <Text style={styles.featureTitle}>Secure</Text>
          <Text style={styles.featureSub}>Encrypted</Text>
        </Animated.View>

        <Animated.View style={[styles.featureCard, styles.featureCardMid, { opacity: card2Anim, transform: [{ scale: card2Anim }] }]}>
          <View style={[styles.featureIconBg, { backgroundColor: '#14532d' }]}>
            <Activity size={22} color="#fff" />
          </View>
          <Text style={[styles.featureTitle, { color: '#14532d' }]}>Smart</Text>
          <Text style={styles.featureSub}>Tracking</Text>
        </Animated.View>

        <Animated.View style={[styles.featureCard, { opacity: card3Anim, transform: [{ scale: card3Anim }] }]}>
          <View style={[styles.featureIconBg, { backgroundColor: '#dcfce7' }]}>
            <Clock size={22} color="#22c55e" />
          </View>
          <Text style={styles.featureTitle}>Instant</Text>
          <Text style={styles.featureSub}>24/7 Access</Text>
        </Animated.View>
      </View>

      {/* CTA Button */}
      <Animated.View style={[styles.btnWrapper, fadeUp(btnAnim)]}>
        <TouchableOpacity style={styles.ctaButton} onPress={handleGetStarted} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Get Started</Text>
          <View style={styles.ctaArrow}>
            <ChevronRight size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.6}>
          <Text style={styles.alreadyText}>
            Already have an account? <Text style={styles.signinLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.Text style={[styles.footerText, { opacity: btnAnim }]}>
        Trusted by Medical Professionals Worldwide
      </Animated.Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22c55e',
  },
  logoArea: { alignItems: 'center', marginBottom: 30 },
  heartBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#14532d',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  brandName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#14532d',
    letterSpacing: -1.5,
    marginTop: 15,
  },
  brandLine: {
    width: 40,
    height: 4,
    backgroundColor: '#22c55e',
    borderRadius: 2,
    marginTop: 6,
  },
  aiLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  taglineArea: { alignItems: 'center', marginBottom: 40 },
  tagline: {
    fontSize: 28,
    fontWeight: '400',
    color: '#166534',
    textAlign: 'center',
    lineHeight: 36,
  },
  taglineBold: { fontWeight: '800', color: '#14532d' },
  taglineSub: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 50,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    elevation: 3,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  featureCardMid: {
    transform: [{ translateY: -12 }],
    borderColor: '#22c55e',
    backgroundColor: '#f8fff9',
  },
  featureIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  featureSub: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  btnWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginLeft: 32,
  },
  ctaArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alreadyText: { fontSize: 14, color: '#4b5563' },
  signinLink: { color: '#14532d', fontWeight: '800' },
  footerText: {
    position: 'absolute',
    bottom: 25,
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
});