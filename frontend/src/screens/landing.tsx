import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeartPulse, ShieldCheck, Clock, ChevronRight, Activity } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const FIRST_LAUNCH_KEY = 'medicare_has_launched';

export default function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Animated values
  const bgCircle1   = useRef(new Animated.Value(0)).current;
  const bgCircle2   = useRef(new Animated.Value(0)).current;
  const logoAnim    = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const card1Anim   = useRef(new Animated.Value(0)).current;
  const card2Anim   = useRef(new Animated.Value(0)).current;
  const card3Anim   = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(bgCircle1, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(bgCircle2, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
      Animated.spring(logoAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(taglineAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.stagger(150, [
        Animated.spring(card1Anim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.spring(card2Anim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.spring(card3Anim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      ]),
      Animated.spring(btnAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    // Heart pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
    navigation.navigate('Login');
  };

  const fadeUp = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{
      translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
    }],
  });

  const scaleIn = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0fdf4" />

      {/* Decorative Background Elements */}
      <Animated.View style={[styles.bgCircle1, {
        opacity: bgCircle1.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }),
        transform: [{ scale: bgCircle1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
      }]} />
      <Animated.View style={[styles.bgCircle2, {
        opacity: bgCircle2.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
        transform: [{ scale: bgCircle2.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
      }]} />

      {/* Logo & Brand */}
      <Animated.View style={[styles.logoArea, scaleIn(logoAnim)]}>
        <Animated.View style={[styles.heartWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.heartBg}>
            <HeartPulse size={42} color="#fff" />
          </View>
        </Animated.View>
        <Text style={styles.brandName}>Medicare</Text>
        <View style={styles.brandLine} />
      </Animated.View>

      {/* Hero Text */}
      <Animated.View style={[styles.taglineArea, fadeUp(taglineAnim)]}>
        <Text style={styles.tagline}>Your health,{'\n'}<Text style={styles.taglineBold}>in trusted hands.</Text></Text>
        <Text style={styles.taglineSub}>
          The complete digital healthcare companion for{'\n'}doctors and patients.
        </Text>
      </Animated.View>

      {/* Feature Grid - All Icons Updated to Lighter Green */}
      <View style={styles.cardsRow}>
        <Animated.View style={[styles.featureCard, scaleIn(card1Anim)]}>
          <View style={[styles.featureIconBg, { backgroundColor: '#dcfce7' }]}>
            <ShieldCheck size={20} color="#22c55e" /> {/* Updated Color */}
          </View>
          <Text style={styles.featureTitle}>Secure</Text>
          <Text style={styles.featureSub}>Encrypted data</Text>
        </Animated.View>

        <Animated.View style={[styles.featureCard, styles.featureCardMid, scaleIn(card2Anim)]}>
          <View style={[styles.featureIconBg, { backgroundColor: '#14532d' }]}>
            <Activity size={20} color="#fff" /> {/* Kept white against dark bg */}
          </View>
          <Text style={[styles.featureTitle, { color: '#14532d' }]}>Smart</Text>
          <Text style={styles.featureSub}>AI Insights</Text>
        </Animated.View>

        <Animated.View style={[styles.featureCard, scaleIn(card3Anim)]}>
          <View style={[styles.featureIconBg, { backgroundColor: '#dcfce7' }]}>
            <Clock size={20} color="#22c55e" /> {/* Updated Color */}
          </View>
          <Text style={styles.featureTitle}>Instant</Text>
          <Text style={styles.featureSub}>24/7 Access</Text>
        </Animated.View>
      </View>

      {/* Action Area */}
      <Animated.View style={[styles.btnWrapper, fadeUp(btnAnim)]}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>Get Started</Text>
          <View style={styles.ctaArrow}>
            <ChevronRight size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.6}>
          <Text style={styles.alreadyText}>
            Already have an account? <Text style={styles.signinLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.Text style={[styles.footerText, { opacity: btnAnim }]}>
        Trusted by Medical Professionals
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4', // Soft mint green background
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  bgCircle1: {
    position: 'absolute', width: width * 1.2, height: width * 1.2,
    borderRadius: width * 0.6, backgroundColor: '#dcfce7',
    top: -width * 0.4, right: -width * 0.3,
  },
  bgCircle2: {
    position: 'absolute', width: width * 0.8, height: width * 0.8,
    borderRadius: width * 0.4, backgroundColor: '#bbf7d0',
    bottom: -width * 0.2, left: -width * 0.4,
  },
  logoArea: { alignItems: 'center', marginBottom: 30 },
  heartWrapper: { marginBottom: 16 },
  heartBg: {
    width: 84, height: 84, borderRadius: 28,
    backgroundColor: '#14532d', // Forest Green
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 15, elevation: 10,
  },
  brandName: {
    fontSize: 42, fontWeight: '900', color: '#14532d',
    letterSpacing: -1.5,
  },
  brandLine: {
    width: 40, height: 4, backgroundColor: '#22c55e',
    borderRadius: 2, marginTop: 4,
  },
  taglineArea: { alignItems: 'center', marginBottom: 40 },
  tagline: {
    fontSize: 28, fontWeight: '400', color: '#166534',
    textAlign: 'center', lineHeight: 36, letterSpacing: -0.5,
  },
  taglineBold: { fontWeight: '800', color: '#14532d' },
  taglineSub: {
    fontSize: 14, color: '#4b5563', marginTop: 12,
    textAlign: 'center', lineHeight: 20,
  },
  cardsRow: {
    flexDirection: 'row', gap: 12, marginBottom: 50,
  },
  featureCard: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 20, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#bbf7d0',
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  featureCardMid: {
    transform: [{ translateY: -10 }],
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  featureIconBg: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  featureTitle: { fontSize: 13, fontWeight: '800', color: '#166534', marginBottom: 4 },
  featureSub:   { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  btnWrapper: { width: '100%', alignItems: 'center' },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#14532d', borderRadius: 20,
    paddingVertical: 18, paddingHorizontal: 24,
    width: '100%', marginBottom: 20,
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  ctaText: {
    fontSize: 18, fontWeight: '800', color: '#fff',
    flex: 1, textAlign: 'center', marginLeft: 32,
  },
  ctaArrow: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  alreadyText: { fontSize: 14, color: '#4b5563' },
  signinLink:  { color: '#14532d', fontWeight: '800' },
  footerText: {
    position: 'absolute', bottom: 30,
    fontSize: 11, color: '#94a3b8', letterSpacing: 1,
    fontWeight: '600', textTransform: 'uppercase',
  },
});