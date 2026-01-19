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
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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
const syncToGoogleSheets = async (entry: any) => {
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzJg9iVO5Dr6mnpjnpV5D4l5MM7eME92eIGIGB9QUii/dev';
  
  try {
    const response = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    return response.ok;
  } catch (error) {
    console.log('Google Sheets sync pending');
    return true;
  }
};

// Equipment Management Modal
const EquipmentModal = ({ visible, onClose, onSave, existingEquipment }: any) => {
  const [equipmentList, setEquipmentList] = useState<string[]>([...existingEquipment]);
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

  const removeEquipment = (index: number) => {
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
const QuantityModal = ({ visible, onClose, equipment, onConfirm, initialQuantities = {} }: any) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (visible) {
      const initialQty: Record<string, number> = {};
      equipment.forEach((item: string) => {
        initialQty[item] = initialQuantities[item] || 0;
      });
      setQuantities(initialQty);
    }
  }, [visible, equipment, initialQuantities]);

  const updateQuantity = (item: string, qty: string) => {
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
            {equipment.map((item: string, index: number) => (
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

// Edit Entry Modal
const EditEntryModal = ({ visible, onClose, entry, equipment, onSave }: any) => {
  const [editData, setEditData] = useState({
    date: '',
    quantities: {} as Record<string, number>,
    names: '',
    affiliation: ''
  });
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  useEffect(() => {
    if (entry) {
      setEditData({
        date: entry.date,
        quantities: entry.quantities || {},
        names: entry.names,
        affiliation: entry.affiliation
      });
    }
  }, [entry]);

  const handleQuantityConfirm = (quantities: Record<string, number>) => {
    setEditData({ ...editData, quantities });
  };

  const handleSave = () => {
    if (!editData.names || !editData.affiliation || Object.keys(editData.quantities).length === 0) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const hasQuantity = Object.values(editData.quantities).some(qty => qty > 0);
    if (!hasQuantity) {
      Alert.alert('Error', 'Please select at least one equipment with quantity > 0');
      return;
    }

    onSave(editData);
  };

  const getEquipmentSummary = (quantities: Record<string, number>) => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([item, qty]) => `${item}: ${qty}`)
      .join(', ') || 'None selected';
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Entry</Text>
            
            <ScrollView style={styles.editScrollView}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={editData.date}
                  onChangeText={(text) => setEditData({ ...editData, date: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Equipment</Text>
                <TouchableOpacity
                  style={styles.selectEquipmentButton}
                  onPress={() => setShowQuantityModal(true)}
                >
                  <Text style={styles.selectEquipmentText}>
                    {getEquipmentSummary(editData.quantities)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Names</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter names"
                  value={editData.names}
                  onChangeText={(text) => setEditData({ ...editData, names: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Affiliation</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter affiliation"
                  value={editData.affiliation}
                  onChangeText={(text) => setEditData({ ...editData, affiliation: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <QuantityModal
        visible={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        equipment={equipment}
        onConfirm={handleQuantityConfirm}
        initialQuantities={editData.quantities}
      />
    </>
  );
};

// Main LogBook Component
export default function LogBookApp() {
  const [equipment, setEquipment] = useState<string[]>(['Microscope', 'Pipette', 'Centrifuge', 'Beaker']);
  const [entries, setEntries] = useState<any[]>([]);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    quantities: {} as Record<string, number>,
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
      const loadedEntries: any[] = [];
      querySnapshot.forEach((doc) => {
        loadedEntries.push({ id: doc.id, ...doc.data() });
      });
      setEntries(loadedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const handleUpdateEquipment = (newEquipment: string[]) => {
    setEquipment(newEquipment);
    setFormData({ ...formData, quantities: {} });
  };

  const handleQuantityConfirm = (quantities: Record<string, number>) => {
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

    // Get current timestamp
    const now = new Date();
    const timestamp = now.toISOString();
    const formattedTimestamp = now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const entry = {
      ...formData,
      timestamp: timestamp,
      formattedTimestamp: formattedTimestamp,
      createdAt: new Date()
    };

    try {
      const docRef = await addDoc(collection(db, 'logEntries'), entry);
      await syncToGoogleSheets({ ...entry, id: docRef.id });
      setEntries([{ id: docRef.id, ...entry }, ...entries]);
      
      setFormData({
        date: new Date().toISOString().split('T')[0],
        quantities: {},
        names: '',
        affiliation: ''
      });
      
      Alert.alert('Success', 'Entry saved successfully!');
    } catch (error: any) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData: any) => {
    setLoading(true);
    try {
      const entryRef = doc(db, 'logEntries', editingEntry.id);
      
      // Get current timestamp for update
      const now = new Date();
      const timestamp = now.toISOString();
      const formattedTimestamp = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const updatedEntry = {
        ...updatedData,
        timestamp: timestamp,
        formattedTimestamp: formattedTimestamp,
        updatedAt: new Date()
      };

      await updateDoc(entryRef, updatedEntry);
      
      // Update local state
      setEntries(entries.map(e => 
        e.id === editingEntry.id 
          ? { id: editingEntry.id, ...updatedEntry } 
          : e
      ));
      
      setShowEditModal(false);
      setEditingEntry(null);
      Alert.alert('Success', 'Entry updated successfully!');
    } catch (error: any) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (entry: any) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'logEntries', entry.id));
              setEntries(entries.filter(e => e.id !== entry.id));
              Alert.alert('Success', 'Entry deleted successfully!');
            } catch (error: any) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getEquipmentSummary = (quantities: Record<string, number>) => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([item, qty]) => `${item}: ${qty}`)
      .join(', ') || 'None selected';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Co-Lab Log Book</Text>
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
                {entry.formattedTimestamp && (
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>Timestamp:</Text>
                    <Text style={[styles.entryValue, styles.timestampText]}>
                      {entry.formattedTimestamp}
                    </Text>
                  </View>
                )}
                
                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEdit(entry)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDelete(entry)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
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

      <EditEntryModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEntry(null);
        }}
        entry={editingEntry}
        equipment={equipment}
        onSave={handleSaveEdit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 16,
    paddingTop: 20,
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
    flex: 1,
    textAlign: 'right',
  },
  equipmentValue: {
    flex: 1,
    textAlign: 'right',
  },
  timestampText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionButtons: {
flexDirection: 'row',
  justifyContent: 'flex-end', 
  marginTop: 12,
  gap: 8,
  },
editButton: {
  // Remove flex: 1
  backgroundColor: '#3b82f6',
  borderRadius: 6,
  paddingVertical: 6,    // Reduced from 10
  paddingHorizontal: 12,  // Added horizontal padding
},
editButtonText: {
  color: 'white',
  textAlign: 'center',
  fontWeight: '600',
  fontSize: 12,          // Smaller font
},
deleteButton: {
  // Remove flex: 1
  backgroundColor: '#ce5656',
  borderRadius: 6,
  paddingVertical: 6,    // Reduced from 10
  paddingHorizontal: 12,  // Added horizontal padding
},
deleteButtonText: {
  color: 'white',
  textAlign: 'center',
  fontWeight: '600',
  fontSize: 12,          // Smaller font
},
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
  editScrollView: {
    maxHeight: 400,
  },
});