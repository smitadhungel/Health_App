// src/screens/doctors/DoctorsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { doctorsAPI } from '../../services/api';

export default function DoctorsScreen({ navigation }: any) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');

  const specializations = [
    'All',
    'Cardiology',
    'Dermatology',
    'Neurology',
    'Pediatrics',
    'Orthopedics',
    'Psychiatry',
  ];

  useEffect(() => {
    loadDoctors();
  }, [selectedSpecialization]);

  const loadDoctors = async () => {
    try {
      const params: any = {};
      if (selectedSpecialization && selectedSpecialization !== 'All') {
        params.specialization = selectedSpecialization;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const data = await doctorsAPI.list(params);
      setDoctors(data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDoctors();
  };

  const handleSearch = () => {
    setLoading(true);
    loadDoctors();
  };

  const renderDoctor = ({ item }: any) => (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() => navigation.navigate('DoctorDetails', { doctorId: item.id })}
    >
      <View style={styles.doctorImageContainer}>
        {item.profile_image ? (
          <Image source={{ uri: item.profile_image }} style={styles.doctorImage} />
        ) : (
          <View style={styles.doctorImagePlaceholder}>
            <Icon name="person" size={40} color="#007AFF" />
          </View>
        )}
        {item.is_available && <View style={styles.availableBadge} />}
      </View>

      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>Dr. {item.full_name}</Text>
        <Text style={styles.specialization}>{item.specialization}</Text>
        
        <View style={styles.infoRow}>
          <Icon name="location" size={14} color="#666" />
          <Text style={styles.infoText}>{item.clinic_address || 'N/A'}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.rating}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {item.average_rating?.toFixed(1) || 'N/A'} ({item.total_reviews || 0})
            </Text>
          </View>
          <Text style={styles.fee}>₹{item.consultation_fee || 'N/A'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Doctors</Text>
        
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={specializations}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.specializationChip,
                selectedSpecialization === item && styles.specializationChipActive,
              ]}
              onPress={() => setSelectedSpecialization(item === 'All' ? '' : item)}
            >
              <Text
                style={[
                  styles.specializationText,
                  selectedSpecialization === item && styles.specializationTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          style={styles.specializationList}
        />
      </View>

      <FlatList
        data={doctors}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDoctor}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="medical" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No doctors found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  specializationList: {
    marginTop: 10,
  },
  specializationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  specializationChipActive: {
    backgroundColor: '#007AFF',
  },
  specializationText: {
    fontSize: 14,
    color: '#333',
  },
  specializationTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 15,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorImageContainer: {
    position: 'relative',
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  doctorImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 15,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  specialization: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 5,
    color: '#333',
  },
  fee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});