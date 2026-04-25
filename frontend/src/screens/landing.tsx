import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar, Dimensions, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeartPulse, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const FIRST_LAUNCH_KEY = 'medicare_has_launched';

export default function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequential "Staggered" Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const onPressIn = () => {
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleGetStarted = async () => {
    try { 
      // Ensure the flag is set before navigating
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true'); 
      navigation.replace('Login'); // Using replace so they can't swipe back to landing
    } catch (e) {
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Decorative Background Blur/Circles */}
      <View style={styles.bgCircle} />
      <View style={styles.bgCircleSecondary} />

      <Animated.View 
        style={[
          styles.content, 
          { opacity: fadeAnim, transform: [{ translateY: slideUp }] }
        ]}
      >
        <View style={styles.topSection}>
          <View style={styles.iconOuterRing}>
            <View style={styles.iconBox}>
              <HeartPulse size={42} color="#fff" strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.brand}>Medicare</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PREMIUM CARE</Text>
            </View>
            <Text style={styles.tagline}>
              Your health journey,{"\n"}
              <Text style={styles.highlightText}>perfectly coordinated.</Text>
            </Text>
            <Text style={styles.sub}>
              Connect with specialists and manage your health records in one secure place.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={handleGetStarted}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              activeOpacity={1}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <View style={styles.btnIconCircle}>
                <ChevronRight size={18} color="#166534" strokeWidth={3} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Pressable 
            onPress={() => navigation.navigate('Login')} 
            style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Text style={styles.secondaryText}>
              Already a member? <Text style={styles.signInLink}>Sign In</Text>
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
    backgroundColor: '#F8FAFC',
  },
  bgCircle: {
    position: 'absolute',
    top: -width * 0.1,
    right: -width * 0.1,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: '#DCFCE7',
    opacity: 0.4,
  },
  bgCircleSecondary: {
    position: 'absolute',
    bottom: -width * 0.2,
    left: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: '#E0F2FE', // Light blue tint for depth
    opacity: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconOuterRing: {
    padding: 12,
    borderRadius: 38,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 24,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: '#166534',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  textContainer: {
    alignItems: 'center',
  },
  brand: {
    fontSize: 42,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: -1.5,
  },
  badge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginTop: 4,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 1.2,
  },
  tagline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 36,
  },
  highlightText: {
    color: '#166534',
  },
  sub: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 18,
    paddingHorizontal: 15,
  },
  footer: {
    width: '100%',
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#166534',
    borderRadius: 20,
    paddingVertical: 14,
    paddingLeft: 32,
    paddingRight: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  btnIconCircle: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    color: '#64748B',
  },
  signInLink: {
    color: '#166534',
    fontWeight: '800',
  },
});