import React, { useEffect, useState, useCallback } from 'react';
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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { doctorsAPI } from '../../services/api';

export default function DoctorsScreen({ navigation }: any) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');

  // Mapping icons to specializations for a richer UI
  const specializations = [
    { name: 'All', icon: 'apps-outline' },
    { name: 'Cardiology', icon: 'heart-outline' },
    { name: 'Dermatology', icon: 'sparkles-outline' },
    { name: 'Neurology', icon: 'pulse-outline' },
    { name: 'Pediatrics', icon: 'balloon-outline' },
    { name: 'Orthopedics', icon: 'body-outline' },
    { name: 'Psychiatry', icon: 'brain-outline' },
  ];

  const loadDoctors = useCallback(async () => {
    try {
      const params: any = {};
      if (selectedSpecialization !== 'All') {
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
  }, [selectedSpecialization, searchQuery]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDoctors();
  };

  const renderDoctor = ({ item }: any) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.doctorCard}
      onPress={() => navigation.navigate('DoctorDetails', { doctorId: item.id })}
    >
      <View style={styles.cardTop}>
        <View style={styles.imageWrapper}>
          {item.profile_image ? (
            <Image source={{ uri: item.profile_image }} style={styles.doctorImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="person" size={30} color="#6366f1" />
            </View>
          )}
          {item.is_available && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.doctorName} numberOfLines={1}>Dr. {item.full_name}</Text>
            <View style={styles.ratingBadge}>
              <Icon name="star" size={12} color="#f59e0b" />
              <Text style={styles.ratingText}>{item.average_rating?.toFixed(1) || '5.0'}</Text>
            </View>
          </View>
          
          <Text style={styles.specText}>{item.specialization}</Text>
          
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={14} color="#94a3b8" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.clinic_address || 'City Medical Center'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardBottom}>
        <View style={styles.experienceBox}>
          <Text style={styles.expValue}>{item.experience_years || '8'}+ Yrs</Text>
          <Text style={styles.expLabel}>Experience</Text>
        </View>
        <View style={styles.feeBox}>
          <Text style={styles.feeValue}>₹{item.consultation_fee}</Text>
          <Text style={styles.feeLabel}>Consultation</Text>
        </View>
        <TouchableOpacity 
          style={styles.bookBtn}
          onPress={() => navigation.navigate('DoctorDetails', { doctorId: item.id })}
        >
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Search & Filter Header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Text style={styles.headerTitle}>Find Doctors</Text>
          <TouchableOpacity style={styles.filterBtn}>
            <Icon name="options-outline" size={20} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            style={styles.input}
            placeholder="Search name or clinic..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={specializations}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.specListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.specChip,
                selectedSpecialization === item.name && styles.specChipActive,
              ]}
              onPress={() => setSelectedSpecialization(item.name)}
            >
              <Icon 
                name={item.icon} 
                size={16} 
                color={selectedSpecialization === item.name ? '#fff' : '#6366f1'} 
              />
              <Text
                style={[
                  styles.specChipText,
                  selectedSpecialization === item.name && styles.specChipTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDoctor}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="search-outline" size={40} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyText}>No doctors found matching your criteria</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header Styles
  header: {
    backgroundColor: '#fff',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 15,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  filterBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
  
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 48,
    marginBottom: 15,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1e293b' },
  
  specListContent: { paddingHorizontal: 20, gap: 10 },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 8,
  },
  specChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  specChipText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  specChipTextActive: { color: '#fff' },

  // Doctor Card Styles
  list: { padding: 20 },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 4,
    shadowColor: '#6366f1',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  imageWrapper: { position: 'relative' },
  doctorImage: { width: 70, height: 70, borderRadius: 20 },
  placeholderImage: { 
    width: 70, height: 70, borderRadius: 20, 
    backgroundColor: '#f5f7ff', justifyContent: 'center', alignItems: 'center' 
  },
  onlineIndicator: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#fff',
  },
  mainInfo: { flex: 1, marginLeft: 15 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  doctorName: { fontSize: 17, fontWeight: '700', color: '#1e293b', flex: 1 },
  ratingBadge: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#fffbeb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400e', marginLeft: 4 },
  specText: { fontSize: 14, color: '#6366f1', fontWeight: '600', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  locationText: { fontSize: 12, color: '#64748b', marginLeft: 4, flex: 1 },
  
  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  experienceBox: { flex: 1 },
  feeBox: { flex: 1, alignItems: 'center' },
  expValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  expLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  feeValue: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  feeLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  
  bookBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: { 
    width: 80, height: 80, borderRadius: 40, 
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 
  },
  emptyText: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
});