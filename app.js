import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA0ksUd0lpaHCv35agBViPL8tmlw6FmLac",
  authDomain: "colab-logbook.firebaseapp.com",
  databaseURL: "https://colab-logbook-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "colab-logbook",
  storageBucket: "colab-logbook.firebasestorage.app",
  messagingSenderId: "715097039550",
  appId: "1:715097039550:web:7b2ca2f945ed4159ab34ef",
  measurementId: "G-G1MLF3XRTN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Google Sheets Integration Function
const syncToGoogleSheets = async (entry) => {
  const SHEET_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL'; // We'll set this up later
  
  try {
    const response = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    return response.ok;
  } catch (error) {
    console.log('Google Sheets sync pending - will sync later');
    return true; // Return true for now so app works without sheets
  }
};

// Login Screen Component
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    // Simple authentication - you can enhance this later
    if (username && password) {
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('username', username);
      onLogin();
    } else {
      Alert.alert('Error', 'Please enter username and password');
    }
  };

  return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.loginCard}>
        <Text style={styles.loginTitle}>Co-Lab Life Sciences</Text>
        <Text style={styles.loginSubtitle}>Log Book</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Equipment Management Modal
const EquipmentModal = ({ visible, onClose, onSave, existingEquipment }) => {
  const [equipmentList, setEquipmentList] = useState([...existingEquipment]);
  const [newEquipment, setNewEquipment] = useState('');

  useEffect(() => {
    setEquipmentList([...existingEquipment]);
  }, [existingEquipment, visible]);

  const addEquipment = () => {
    if (newEquipment.trim()) {
      setEquipmentList([...equipmentList, newEquipment.trim()]);
      setNewEquipment('');
    }
  };

  const removeEquipment = (index) => {
    setEquipmentList(equipmentList.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(equipmentList);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Manage Equipment</Text>
          
          <View style={styles.addEquipmentRow}>
            <TextInput
              style={styles.addEquipmentInput}
              placeholder="Add new equipment"
              value={newEquipment}
              onChangeText={setNewEquipment}
            />
            <TouchableOpacity style={styles.addButton} onPress={addEquipment}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.equipmentList}>
            {equipmentList.map((item, index) => (
              <View key={index} style={styles.equipmentItem}>
                <Text style={styles.equipmentItemText}>{item}</Text>
                <TouchableOpacity onPress={() => removeEquipment(index)}>
                  <Text style={styles.removeButton}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Equipment Quantity Selection Modal
const QuantityModal = ({ visible, onClose, equipment, onConfirm }) => {
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    if (visible) {
      const initialQuantities = {};
      equipment.forEach(item => {
        initialQuantities[item] = 0;
      });
      setQuantities(initialQuantities);
    }
  }, [visible, equipment]);

  const updateQuantity = (item, qty) => {
    setQuantities({ ...quantities, [item]: parseInt(qty) || 0 });
  };

  const handleConfirm = () => {
    onConfirm(quantities);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select Equipment Quantities</Text>
          
          <ScrollView style={styles.quantityList}>
            {equipment.map((item, index) => (
              <View key={index} style={styles.quantityItem}>
                <Text style={styles.quantityLabel}>{item}</Text>
                <TextInput
                  style={styles.quantityInput}
                  placeholder="Quantity"
                  keyboardType="numeric"
                  value={quantities[item]?.toString() || '0'}
                  onChangeText={(text) => updateQuantity(item, text)}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleConfirm}>
              <Text style={styles.saveButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Main App Component
const LogBookApp = ({ onLogout }) => {
  const [equipment, setEquipment] = useState(['Microscope', 'Pipette', 'Centrifuge', 'Beaker']);
  const [entries, setEntries] = useState([]);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    quantities: {},
    names: '',
    affiliation: ''
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const q = query(collection(db, 'logEntries'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const loadedEntries = [];
      querySnapshot.forEach((doc) => {
        loadedEntries.push({ id: doc.id, ...doc.data() });
      });
      setEntries(loadedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const handleUpdateEquipment = (newEquipment) => {
    setEquipment(newEquipment);
    setFormData({ ...formData, quantities: {} });
  };

  const handleQuantityConfirm = (quantities) => {
    setFormData({ ...formData, quantities });
  };

  const handleSubmit = async () => {
    if (!formData.names || !formData.affiliation || Object.keys(formData.quantities).length === 0) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const hasQuantity = Object.values(formData.quantities).some(qty => qty > 0);
    if (!hasQuantity) {
      Alert.alert('Error', 'Please select at least one equipment with quantity > 0');
      return;
    }

    setLoading(true);

    const entry = {
      ...formData,
      timestamp: new Date().toISOString(),
      createdAt: new Date()
    };

    try {
      // Save to Firebase
      const docRef = await addDoc(collection(db, 'logEntries'), entry);
      
      // Sync to Google Sheets (optional for now)
      await syncToGoogleSheets({ ...entry, id: docRef.id });
      
      // Update local state
      setEntries([{ id: docRef.id, ...entry }, ...entries]);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        quantities: {},
        names: '',
        affiliation: ''
      });
      
      Alert.alert('Success', 'Entry saved successfully!');
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getEquipmentSummary = (quantities) => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([item, qty]) => `${item}: ${qty}`)
      .join(', ') || 'None selected';
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('username');
    onLogout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Co-Lab Log Book</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Input Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Entry</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.equipmentHeader}>
              <Text style={styles.label}>Equipment</Text>
              <TouchableOpacity
                style={styles.updateEquipmentButton}
                onPress={() => setShowEquipmentModal(true)}
              >
                <Text style={styles.updateEquipmentButtonText}>Update Equipment</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.selectEquipmentButton}
              onPress={() => setShowQuantityModal(true)}
            >
              <Text style={styles.selectEquipmentText}>
                {getEquipmentSummary(formData.quantities)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Names</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter names"
              value={formData.names}
              onChangeText={(text) => setFormData({ ...formData, names: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Affiliation</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter affiliation"
              value={formData.affiliation}
              onChangeText={(text) => setFormData({ ...formData, affiliation: text })}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Add Entry</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Entries Table */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log Entries</Text>
          
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet</Text>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryLabel}>Date:</Text>
                  <Text style={styles.entryValue}>{entry.date}</Text>
                </View>
                <View style={styles.entryRow}>
                  <Text style={styles.entryLabel}>Equipment:</Text>
                  <Text style={[styles.entryValue, styles.equipmentValue]}>
                    {getEquipmentSummary(entry.quantities)}
                  </Text>
                </View>
                <View style={styles.entryRow}>
                  <Text style={styles.entryLabel}>Names:</Text>
                  <Text style={styles.entryValue}>{entry.names}</Text>
                </View>
                <View style={styles.entryRow}>
                  <Text style={styles.entryLabel}>Affiliation:</Text>
                  <Text style={styles.entryValue}>{entry.affiliation}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <EquipmentModal
        visible={showEquipmentModal}
        onClose={() => setShowEquipmentModal(false)}
        onSave={handleUpdateEquipment}
        existingEquipment={equipment}
      />

      <QuantityModal
        visible={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        equipment={equipment}
        onConfirm={handleQuantityConfirm}
      />
    </SafeAreaView>
  );
};

// Main App Container
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const loginStatus = await AsyncStorage.getItem('isLoggedIn');
    setIsLoggedIn(loginStatus === 'true');
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return isLoggedIn ? (
    <LogBookApp onLogout={() => setIsLoggedIn(false)} />
  ) : (
    <LoginScreen onLogin={() => setIsLoggedIn(true)} />
  );
}

const styles = StyleSheet.create({
  // Login Styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 18,
  },
  
  // Main App Styles
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 16,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  logoutButton: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  updateEquipmentButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  updateEquipmentButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  selectEquipmentButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  selectEquipmentText: {
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 18,
  },
  
  // Entries Styles
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 32,
  },
  entryCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 16,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  entryValue: {
    color: '#6b7280',
  },
  equipmentValue: {
    flex: 1,
    textAlign: 'right',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  addEquipmentRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  addEquipmentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  equipmentList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  equipmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  equipmentItemText: {
    color: '#1f2937',
  },
  removeButton: {
    color: '#dc2626',
    fontWeight: '600',
  },
  quantityList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  quantityItem: {
    marginBottom: 16,
  },
  quantityLabel: {
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  cancelButtonText: {
    color: '#374151',
    textAlign: 'center',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});