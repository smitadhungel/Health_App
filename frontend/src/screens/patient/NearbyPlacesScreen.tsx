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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { MapPin, Navigation, Phone,ArrowLeft } from 'lucide-react-native';
import api from '../../services/api'; // your axios instance with auth interceptor

interface Place {
  id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
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
    if (location) {
      fetchPlaces();
    }
  }, [location, placeType]);

  const requestLocationPermission = async () => {
    try {
      let permission;
      if (Platform.OS === 'android') {
        permission = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      } else {
        permission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
      }
      const result = await request(permission);
      if (result === RESULTS.GRANTED) {
        getCurrentLocation();
      } else {
        Alert.alert('Permission Denied', 'Location permission is needed to find nearby places.');
        setFetchingLocation(false);
      }
    } catch (error) {
      console.error('Permission error:', error);
      setFetchingLocation(false);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setFetchingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert('Error', 'Unable to get your location.');
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
        params: {
          lat: location.lat,
          lng: location.lng,
          type: placeType,
          radius: 5000,
        },
      });
      const results = response.data.results || [];
      setPlaces(results);
      console.log('Places response:', response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load nearby places.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (lat: number, lng: number, name: string) => {
    const url = Platform.select({
      ios: `maps://?q=${name}&ll=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${name}`,
    });
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps.'));
    }
  };

  const renderPlaceItem = ({ item }: { item: Place }) => (
    <TouchableOpacity style={styles.card} onPress={() => openMaps(item.geometry.location.lat, item.geometry.location.lng, item.name)}>
      <View style={styles.cardContent}>
        <MapPin size={24} color="#16a34a" />
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.address}>{item.vicinity}</Text>
          {item.rating && (
            <Text style={styles.rating}>★ {item.rating} ({item.user_ratings_total})</Text>
          )}
          {item.opening_hours && (
            <Text style={[styles.openStatus, item.opening_hours.open_now ? styles.open : styles.closed]}>
              {item.opening_hours.open_now ? 'Open now' : 'Closed'}
            </Text>
          )}
        </View>
        <Navigation size={20} color="#16a34a" />
      </View>
    </TouchableOpacity>
  );

  if (fetchingLocation || (loading && !places.length)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>
          {fetchingLocation ? 'Getting your location...' : 'Loading places...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#16a34a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Places</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, placeType === 'hospital' && styles.activeType]}
          onPress={() => setPlaceType('hospital')}
        >
          <Text style={[styles.typeText, placeType === 'hospital' && styles.activeTypeText]}>
            Hospitals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, placeType === 'pharmacy' && styles.activeType]}
          onPress={() => setPlaceType('pharmacy')}
        >
          <Text style={[styles.typeText, placeType === 'pharmacy' && styles.activeTypeText]}>
            Pharmacies
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        renderItem={renderPlaceItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MapPin size={48} color="#bbf7d0" />
              <Text style={styles.emptyText}>No {placeType}s found nearby.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

// Styles (green theme)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4b5563' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#14532d' },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 30,
    padding: 4,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 30,
    alignItems: 'center',
  },
  activeType: {
    backgroundColor: '#16a34a',
  },
  typeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
  },
  activeTypeText: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14532d',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  rating: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  openStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  open: {
    color: '#16a34a',
  },
  closed: {
    color: '#ef4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
});