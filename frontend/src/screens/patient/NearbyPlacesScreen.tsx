import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { MapPin, Navigation, ArrowLeft, Star, Clock } from 'lucide-react-native';
import api from '../../services/api';

interface Place {
  id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: { lat: number; lng: number; };
  };
  opening_hours?: {
    open_now: boolean;
  };
}

export default function NearbyPlacesScreen() {
  const navigation = useNavigation();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [placeType, setPlaceType] = useState<'hospital' | 'pharmacy'>('hospital');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(true);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (location) fetchPlaces();
  }, [location, placeType]);

  const requestLocationPermission = async () => {
    try {
      const permission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION 
        : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
      
      const result = await request(permission);
      if (result === RESULTS.GRANTED) {
        getCurrentLocation();
      } else {
        Alert.alert('Permission Denied', 'Location access is required.');
        setFetchingLocation(false);
      }
    } catch (error) {
      setFetchingLocation(false);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setFetchingLocation(false);
      },
      (error) => {
        Alert.alert('Error', 'Unable to get location.');
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const fetchPlaces = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const response = await api.get('/places/nearby/', {
        params: { lat: location.lat, lng: location.lng, type: placeType, radius: 5000 },
      });
      setPlaces(response.data.results || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load nearby places.');
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (lat: number, lng: number, name: string) => {
    const url = Platform.select({
      ios: `maps://?q=${name}&ll=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${name}`,
    });
    if (url) Linking.openURL(url);
  };

  const renderPlaceItem = ({ item }: { item: Place }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      style={styles.card} 
      onPress={() => openMaps(item.geometry.location.lat, item.geometry.location.lng, item.name)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <MapPin size={20} color="#16a34a" />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.address} numberOfLines={1}>{item.vicinity}</Text>
        </View>
        <View style={styles.navCircle}>
            <Navigation size={18} color="#fff" />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          {item.rating && (
            <View style={styles.badge}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.badgeText}>{item.rating} ({item.user_ratings_total})</Text>
            </View>
          )}
          {item.opening_hours && (
            <View style={styles.badge}>
              <Clock size={14} color={item.opening_hours.open_now ? "#16a34a" : "#ef4444"} />
              <Text style={[styles.badgeText, { color: item.opening_hours.open_now ? "#16a34a" : "#ef4444" }]}>
                {item.opening_hours.open_now ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hospital / Paharmacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.selectorContainer}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, placeType === 'hospital' && styles.activeType]}
            onPress={() => setPlaceType('hospital')}
          >
            <Text style={[styles.typeText, placeType === 'hospital' && styles.activeTypeText]}>Hospitals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, placeType === 'pharmacy' && styles.activeType]}
            onPress={() => setPlaceType('pharmacy')}
          >
            <Text style={[styles.typeText, placeType === 'pharmacy' && styles.activeTypeText]}>Pharmacies</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !places.length ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaceItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MapPin size={60} color="#d1fae5" />
              <Text style={styles.emptyText}>No {placeType}s found in this area.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  backButton: { padding: 8, borderRadius: 12, backgroundColor: '#f3f4f6' },
  
  selectorContainer: { paddingHorizontal: 16, marginVertical: 12 },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 4,
  },
  typeButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  activeType: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  typeText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  activeTypeText: { color: '#16a34a' },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  titleContainer: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  address: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  navCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  
  cardFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  metaRow: { flexDirection: 'row', gap: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 15, color: '#9ca3af', marginTop: 16, fontWeight: '500' },
});