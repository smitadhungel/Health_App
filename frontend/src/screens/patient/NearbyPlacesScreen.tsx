import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

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

import { useFocusEffect } from '@react-navigation/native';

import Geolocation from '@react-native-community/geolocation';

import {
  request,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';

import {
  MapPin,
  Navigation,
  Star,
  Clock,
  RefreshCw,
} from 'lucide-react-native';

import api from '../../services/api';

interface Place {
  id?: string;

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
  const [places, setPlaces] = useState<Place[]>([]);

  const [loading, setLoading] = useState(false);

  const [placeType, setPlaceType] = useState<
    'hospital' | 'pharmacy'
  >('hospital');

  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [locationError, setLocationError] =
    useState<string | null>(null);

  const [fetchingLocation, setFetchingLocation] =
    useState(true);

  const isMounted = useRef(true);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;

      return () => {
        isMounted.current = false;
      };
    }, [])
  );

  useEffect(() => {
    initLocation();
  }, []);

  useEffect(() => {
    if (location) {
      fetchPlaces(location, placeType);
    }
  }, [location, placeType]);

  const initLocation = async () => {
    try {
      setFetchingLocation(true);

      setLocationError(null);

      const permission =
        Platform.OS === 'android'
          ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
          : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;

      const result = await request(permission);

      console.log(
        '==== PERMISSION RESULT ====',
        result
      );

      if (result === RESULTS.GRANTED) {
        getCurrentLocation();
      } else {
        setLocationError(
          'Location permission denied.'
        );

        setFetchingLocation(false);
      }
    } catch (error) {
      console.log(
        '==== PERMISSION ERROR ====',
        error
      );

      setLocationError(
        'Failed to request location permission.'
      );

      setFetchingLocation(false);
    }
  };

  const getCurrentLocation = () => {
    console.log(
      '==== GETTING CURRENT LOCATION ===='
    );

    Geolocation.getCurrentPosition(
      position => {
        if (!isMounted.current) return;

        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        console.log(
          '==== LOCATION SUCCESS ====',
          coords
        );

        setLocation(coords);

        setFetchingLocation(false);
      },

      error => {
        console.log(
          '==== HIGH ACCURACY FAILED ====',
          error
        );

        // fallback low accuracy
        Geolocation.getCurrentPosition(
          fallbackPosition => {
            if (!isMounted.current) return;

            const coords = {
              lat: fallbackPosition.coords.latitude,
              lng: fallbackPosition.coords.longitude,
            };

            console.log(
              '==== FALLBACK LOCATION SUCCESS ====',
              coords
            );

            setLocation(coords);

            setFetchingLocation(false);
          },

          fallbackError => {
            console.log(
              '==== FALLBACK LOCATION FAILED ====',
              fallbackError
            );

            setLocationError(
              'Unable to get your location. Please turn on GPS.'
            );

            setFetchingLocation(false);
          },

          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000,
          }
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const fetchPlaces = async (
    loc: { lat: number; lng: number },
    type: 'hospital' | 'pharmacy'
  ) => {
    try {
      if (!isMounted.current) return;

      setLoading(true);

      console.log(
        '==== CALLING BACKEND NOW ===='
      );

      console.log('Location:', loc);

      console.log('Type:', type);

      const response = await api.get(
        '/places/nearby/',
        {
          params: {
            lat: loc.lat,
            lng: loc.lng,
            radius: 5000,
            type,
          },
        }
      );

      console.log(
        '==== BACKEND RESPONSE ====',
        response.status
      );

      console.log(response.data);

      if (!isMounted.current) return;

      setPlaces(response.data?.results || []);
    } catch (error: any) {
      console.log(
        '==== API ERROR ===='
      );

      console.log(
        'STATUS:',
        error?.response?.status
      );

      console.log(
        'DATA:',
        error?.response?.data
      );

      console.log(
        'MESSAGE:',
        error?.message
      );

      let message =
        'Failed to load nearby places.';

      if (error?.response?.status === 401) {
        message =
          'Authentication failed. Please login again.';
      } else if (
        error?.response?.data?.error
      ) {
        message =
          error.response.data.error;
      }

      Alert.alert('Error', message);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleRetry = () => {
    setLocationError(null);

    setPlaces([]);

    if (location) {
      fetchPlaces(location, placeType);
    } else {
      initLocation();
    }
  };

  const handleTypeChange = (
    type: 'hospital' | 'pharmacy'
  ) => {
    if (type === placeType) return;

    setPlaceType(type);
  };

  const openMaps = (
    lat: number,
    lng: number,
    name: string
  ) => {
    if (!lat || !lng) {
      Alert.alert(
        'Location Error',
        'Invalid coordinates.'
      );

      return;
    }

    const url = Platform.select({
      ios: `maps://?q=${encodeURIComponent(
        name
      )}&ll=${lat},${lng}`,

      android: `geo:${lat},${lng}?q=${encodeURIComponent(
        name
      )}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const renderPlaceItem = ({
    item,
  }: {
    item: Place;
  }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() =>
        openMaps(
          item.geometry.location.lat,
          item.geometry.location.lng,
          item.name
        )
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <MapPin
            size={20}
            color="#16a34a"
          />
        </View>

        <View style={styles.titleContainer}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <Text
            style={styles.address}
            numberOfLines={2}
          >
            {item.vicinity}
          </Text>
        </View>

        <View style={styles.navCircle}>
          <Navigation
            size={18}
            color="#fff"
          />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          {item.rating ? (
            <View style={styles.badge}>
              <Star
                size={14}
                color="#f59e0b"
                fill="#f59e0b"
              />

              <Text style={styles.badgeText}>
                {item.rating}
              </Text>
            </View>
          ) : null}

          {item.opening_hours ? (
            <View style={styles.badge}>
              <Clock
                size={14}
                color={
                  item.opening_hours.open_now
                    ? '#16a34a'
                    : '#ef4444'
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      item.opening_hours.open_now
                        ? '#16a34a'
                        : '#ef4444',
                  },
                ]}
              >
                {item.opening_hours.open_now
                  ? 'Open Now'
                  : 'Closed'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (fetchingLocation) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator
          size="large"
          color="#16a34a"
        />

        <Text style={styles.loadingText}>
          Getting your location...
        </Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.fullCenter}>
        <MapPin
          size={50}
          color="#ef4444"
        />

        <Text style={styles.errorText}>
          {locationError}
        </Text>

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={handleRetry}
        >
          <RefreshCw
            size={16}
            color="#fff"
          />

          <Text style={styles.retryBtnText}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Nearby Services
        </Text>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRetry}
        >
          <RefreshCw
            size={18}
            color="#16a34a"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.selectorContainer}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              placeType === 'hospital' &&
                styles.activeType,
            ]}
            onPress={() =>
              handleTypeChange('hospital')
            }
          >
            <Text
              style={[
                styles.typeText,
                placeType === 'hospital' &&
                  styles.activeTypeText,
              ]}
            >
              Hospitals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              placeType === 'pharmacy' &&
                styles.activeType,
            ]}
            onPress={() =>
              handleTypeChange('pharmacy')
            }
          >
            <Text
              style={[
                styles.typeText,
                placeType === 'pharmacy' &&
                  styles.activeTypeText,
              ]}
            >
              Pharmacies
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.fullCenter}>
          <ActivityIndicator
            size="large"
            color="#16a34a"
          />

          <Text style={styles.loadingText}>
            Finding nearby places...
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item, index) =>
            item.id || index.toString()
          }
          renderItem={renderPlaceItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MapPin
                size={60}
                color="#d1fae5"
              />

              <Text style={styles.emptyText}>
                No nearby places found.
              </Text>

              <TouchableOpacity
                style={styles.retryBtn}
                onPress={handleRetry}
              >
                <RefreshCw
                  size={16}
                  color="#fff"
                />

                <Text style={styles.retryBtnText}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  fullCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
  },

  errorText: {
    textAlign: 'center',
    color: '#dc2626',
    marginTop: 10,
    fontSize: 14,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 16,

    paddingTop:
      Platform.OS === 'ios'
        ? 50
        : 20,

    paddingBottom: 16,

    backgroundColor: '#fff',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  refreshBtn: {
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 10,
  },

  selectorContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },

  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 4,
  },

  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  activeType: {
    backgroundColor: '#fff',
  },

  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },

  activeTypeText: {
    color: '#16a34a',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleContainer: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  address: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },

  navCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },

  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: '#9ca3af',
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
    gap: 6,
  },

  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});