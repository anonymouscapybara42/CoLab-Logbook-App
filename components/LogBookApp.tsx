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
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
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
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  app = initializeApp(firebaseConfig, 'colab-logbook');
}
const db = getFirestore(app);
 
// Google Sheets Integration Function
const syncToGoogleSheets = async (entry: any, action: 'add' | 'update' | 'delete' = 'add') => {
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzGsNhLciihblT4Nm3R9W7q2uqyAJqHgqi3d2hEopCptLYM5WCdLRPfPW7R3oVRrIOZWg/exec';
 
  try {
    const quantities = (entry.quantities || {}) as Record<string, number>;
    const equipmentStr = Object.entries(quantities)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([item, qty]) => `${item}: ${qty}`)
      .join(', ');
 
    const sheetData = {
      id: entry.id,
      date: entry.date,
      equipment: equipmentStr,
      names: entry.names,
      affiliation: entry.affiliation,
      timestamp: entry.formattedTimestamp || entry.timestamp,
      action: action
    };
 
    console.log('Sending to Google Sheets:', sheetData);
 
    await fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sheetData)
    });
 
    console.log('Google Sheets sync sent');
    return true;
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return false;
  }
};
 
// Equipment Management Modal
const EquipmentModal = ({ visible, onClose, onSave, existingEquipment }: any) => {
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [saving, setSaving] = useState(false);
 
  useEffect(() => {
    if (visible) {
      setEquipmentList([...existingEquipment]);
    }
  }, [visible]);
 
  const addEquipment = () => {
    if (newEquipment.trim()) {
      if (equipmentList.includes(newEquipment.trim())) {
        Alert.alert('Duplicate', 'This equipment already exists');
        return;
      }
      setEquipmentList([...equipmentList, newEquipment.trim()]);
      setNewEquipment('');
    }
  };
 
  const removeEquipment = (index: number) => {
    setEquipmentList(equipmentList.filter((_, i) => i !== index));
  };
 
  const handleSave = async () => {
    if (equipmentList.length === 0) {
      Alert.alert('Error', 'Please add at least one equipment item');
      return;
    }
    setSaving(true);
    await onSave(equipmentList);
    setSaving(false);
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
              onSubmitEditing={addEquipment}
            />
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={addEquipment}
              disabled={!newEquipment.trim()}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
 
          <ScrollView style={styles.equipmentList}>
            {equipmentList.length === 0 ? (
              <Text style={styles.emptyEquipmentText}>No equipment added yet</Text>
            ) : (
              equipmentList.map((item, index) => (
                <View key={index} style={styles.equipmentItem}>
                  <Text style={styles.equipmentItemText}>{item}</Text>
                  <TouchableOpacity onPress={() => removeEquipment(index)}>
                    <Text style={styles.removeButton}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
 
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.submitButtonDisabled]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
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
    if (visible && equipment.length > 0) {
      const initialQty: Record<string, number> = {};
      equipment.forEach((item: string) => {
        // Use existing quantity if available, otherwise default to 0
        initialQty[item] = initialQuantities[item] !== undefined ? initialQuantities[item] : 0;
      });
      setQuantities(initialQty);
    }
  }, [visible]);
 
  const updateQuantity = (item: string, qty: string) => {
    const numQty = parseInt(qty) || 0;
    setQuantities(prev => ({ ...prev, [item]: numQty }));
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
 
          {equipment.length === 0 ? (
            <View style={styles.emptyEquipmentContainer}>
              <Text style={styles.emptyEquipmentText}>
                No equipment available. Please add equipment first.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.quantityList}>
              {equipment.map((item: string, index: number) => (
                <View key={index} style={styles.quantityItem}>
                  <Text style={styles.quantityLabel}>{item}</Text>
                  <TextInput
                    style={styles.quantityInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={quantities[item]?.toString() || '0'}
                    onChangeText={(text) => updateQuantity(item, text)}
                  />
                </View>
              ))}
            </ScrollView>
          )}
 
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleConfirm}
              disabled={equipment.length === 0}
            >
              <Text style={styles.saveButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
 
// Edit Entry Modal - UPDATED WITH PRESERVED STATE
const EditEntryModal = ({ visible, onClose, entry, equipment, onSave }: any) => {
  const [editData, setEditData] = useState({
    date: '',
    quantities: {} as Record<string, number>,
    names: '',
    affiliation: ''
  });
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [combinedEquipment, setCombinedEquipment] = useState<string[]>([]);
 
  useEffect(() => {
    if (entry && visible) {
      setEditData({
        date: entry.date || '',
        quantities: entry.quantities || {},
        names: entry.names || '',
        affiliation: entry.affiliation || ''
      });
 
      // PRESERVE OLD EQUIPMENT: Combine current equipment with equipment from this entry
      const entryEquipment = Object.keys(entry.quantities || {});
      const merged = [...new Set([...equipment, ...entryEquipment])]; // Remove duplicates
      setCombinedEquipment(merged);
    }
  }, [entry, visible, equipment]);
 
  const handleQuantityConfirm = (quantities: Record<string, number>) => {
    setEditData(prev => ({ ...prev, quantities }));
  };
 
  const handleSave = async () => {
    if (!editData.names.trim() || !editData.affiliation.trim()) {
      Alert.alert('Error', 'Please fill in Names and Affiliation');
      return;
    }
 
    if (Object.keys(editData.quantities).length === 0) {
      Alert.alert('Error', 'Please select equipment quantities');
      return;
    }
 
    const hasQuantity = Object.values(editData.quantities).some(qty => qty > 0);
    if (!hasQuantity) {
      Alert.alert('Error', 'Please select at least one equipment with quantity > 0');
      return;
    }
 
    setIsSaving(true);
    await onSave(editData);
    setIsSaving(false);
  };
 
  const getEquipmentSummary = (quantities: Record<string, number>) => {
    if (!quantities || Object.keys(quantities).length === 0) return 'Tap to select equipment';
    const summary = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([item, qty]) => `${item}: ${qty}`)
      .join(', ');
    return summary || 'Tap to select equipment';
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
                  onChangeText={(text) => setEditData(prev => ({ ...prev, date: text }))}
                />
              </View>
 
              <View style={styles.formGroup}>
                <Text style={styles.label}>Equipment</Text>
                <TouchableOpacity
                  style={styles.selectEquipmentButton}
                  onPress={() => setShowQuantityModal(true)}
                  disabled={combinedEquipment.length === 0}
                >
                  <Text style={styles.selectEquipmentText}>
                    {combinedEquipment.length === 0 ? 'No equipment available' : getEquipmentSummary(editData.quantities)}
                  </Text>
                </TouchableOpacity>
                {combinedEquipment.length > equipment.length && (
                  <Text style={styles.deprecatedNote}>
                    * Some equipment items are no longer in the main list
                  </Text>
                )}
              </View>
 
              <View style={styles.formGroup}>
                <Text style={styles.label}>Names</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter names"
                  value={editData.names}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, names: text }))}
                />
              </View>
 
              <View style={styles.formGroup}>
                <Text style={styles.label}>Affiliation</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter affiliation"
                  value={editData.affiliation}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, affiliation: text }))}
                />
              </View>
            </ScrollView>
 
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, isSaving && styles.submitButtonDisabled]} 
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
 
      <QuantityModal
        visible={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        equipment={combinedEquipment}
        onConfirm={handleQuantityConfirm}
        initialQuantities={editData.quantities}
      />
    </>
  );
};
 
// Main LogBook Component
export default function LogBookApp() {
  const [equipment, setEquipment] = useState<string[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);
 
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    quantities: {} as Record<string, number>,
    names: '',
    affiliation: ''
  });
 
  useEffect(() => {
    initializeApp();
  }, []);
 
  const initializeApp = async () => {
    await loadEquipment();
    await loadEntries();
  };
 
  // Load equipment from Firebase
  const loadEquipment = async () => {
    setIsLoadingEquipment(true);
    try {
      const equipmentDoc = await getDoc(doc(db, 'settings', 'equipment'));
      if (equipmentDoc.exists()) {
        const data = equipmentDoc.data();
        setEquipment(data.list || []);
      } else {
        // First time setup - equipment list is empty
        setEquipment([]);
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
      setEquipment([]);
    } finally {
      setIsLoadingEquipment(false);
    }
  };
 
  // Save equipment to Firebase
  const saveEquipment = async (equipmentList: string[]) => {
    try {
      await setDoc(doc(db, 'settings', 'equipment'), {
        list: equipmentList,
        updatedAt: new Date().toISOString()
      });
      console.log('Equipment saved to Firebase');
      return true;
    } catch (error) {
      console.error('Error saving equipment:', error);
      Alert.alert('Error', 'Failed to save equipment');
      return false;
    }
  };
 
  const loadEntries = async () => {
    setIsLoadingEntries(true);
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
      Alert.alert('Error', 'Failed to load entries');
    } finally {
      setIsLoadingEntries(false);
    }
  };
 
  const handleUpdateEquipment = async (newEquipment: string[]) => {
    const success = await saveEquipment(newEquipment);
    if (success) {
      setEquipment(newEquipment);
      // Reset quantities when equipment changes
      setFormData(prev => ({ ...prev, quantities: {} }));
      Alert.alert('Success', 'Equipment list updated successfully');
    }
  };
 
  const handleQuantityConfirm = (quantities: Record<string, number>) => {
    setFormData(prev => ({ ...prev, quantities }));
  };
 
  const handleSubmit = async () => {
    if (!formData.names.trim() || !formData.affiliation.trim()) {
      Alert.alert('Error', 'Please fill in Names and Affiliation');
      return;
    }
 
    if (Object.keys(formData.quantities).length === 0) {
      Alert.alert('Error', 'Please select equipment quantities');
      return;
    }
 
    const hasQuantity = Object.values(formData.quantities).some(qty => qty > 0);
    if (!hasQuantity) {
      Alert.alert('Error', 'Please select at least one equipment with quantity > 0');
      return;
    }
 
    setLoading(true);
 
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
      createdAt: timestamp
    };
 
    try {
      const docRef = await addDoc(collection(db, 'logEntries'), entry);
      const newEntry = { id: docRef.id, ...entry };
 
      await syncToGoogleSheets(newEntry, 'add');
 
      setEntries(prev => [newEntry, ...prev]);
 
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
    try {
      const entryRef = doc(db, 'logEntries', editingEntry.id);
 
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
        updatedAt: timestamp
      };
 
      await updateDoc(entryRef, updatedEntry);
 
      const fullUpdatedEntry = { id: editingEntry.id, ...updatedEntry };
 
      await syncToGoogleSheets(fullUpdatedEntry, 'update');
 
      setEntries(entries.map(e => 
        e.id === editingEntry.id ? fullUpdatedEntry : e
      ));
 
      setShowEditModal(false);
      setEditingEntry(null);
      Alert.alert('Success', 'Entry updated successfully!');
    } catch (error: any) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry: ' + error.message);
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
 
              await syncToGoogleSheets(entry, 'delete');
 
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
    if (!quantities || Object.keys(quantities).length === 0) return 'None selected';
    const summary = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([item, qty]) => `${item}: ${qty}`)
      .join(', ');
    return summary || 'None selected';
  };
 
  if (isLoadingEquipment || isLoadingEntries) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
 
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
 
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Co-Lab Log Book</Text>
      </View>
 
      <ScrollView style={styles.content}>
        {/* Equipment Setup Notice */}
        {equipment.length === 0 && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>⚠️ Setup Required</Text>
            <Text style={styles.noticeText}>
              Please add equipment items using the "Add Equipment" button below before creating entries.
            </Text>
          </View>
        )}
 
        {/* Input Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Entry</Text>
 
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={formData.date}
              onChangeText={(text) => setFormData(prev => ({ ...prev, date: text }))}
            />
          </View>
 
          <View style={styles.formGroup}>
            <View style={styles.equipmentHeader}>
              <Text style={styles.label}>Equipment</Text>
              <TouchableOpacity
                style={styles.updateEquipmentButton}
                onPress={() => setShowEquipmentModal(true)}
              >
                <Text style={styles.updateEquipmentButtonText}>
                  {equipment.length === 0 ? 'Add Equipment' : 'Update Equipment'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.selectEquipmentButton}
              onPress={() => setShowQuantityModal(true)}
              disabled={equipment.length === 0}
            >
              <Text style={[
                styles.selectEquipmentText,
                equipment.length === 0 && styles.disabledText
              ]}>
                {equipment.length === 0 ? 'No equipment available' : getEquipmentSummary(formData.quantities)}
              </Text>
            </TouchableOpacity>
          </View>
 
          <View style={styles.formGroup}>
            <Text style={styles.label}>Names</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter names"
              value={formData.names}
              onChangeText={(text) => setFormData(prev => ({ ...prev, names: text }))}
            />
          </View>
 
          <View style={styles.formGroup}>
            <Text style={styles.label}>Affiliation</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter affiliation"
              value={formData.affiliation}
              onChangeText={(text) => setFormData(prev => ({ ...prev, affiliation: text }))}
            />
          </View>
 
          <TouchableOpacity
            style={[styles.submitButton, (loading || equipment.length === 0) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || equipment.length === 0}
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
  noticeCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#78350f',
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
disabledText: {
color: '#9ca3af',
},
deprecatedNote: {
fontSize: 12,
color: '#f59e0b',
fontStyle: 'italic',
marginTop: 4,
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
loadingContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
},
loadingText: {
marginTop: 12,
color: '#6b7280',
fontSize: 16,
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
marginTop: 12,
gap: 8,
},
editButton: {
flex: 1,
backgroundColor: '#3b82f6',
borderRadius: 6,
padding: 10,
},
editButtonText: {
color: 'white',
textAlign: 'center',
fontWeight: '600',
},
deleteButton: {
flex: 1,
backgroundColor: '#ef4444',
borderRadius: 6,
padding: 10,
},
deleteButtonText: {
color: 'white',
textAlign: 'center',
fontWeight: '600',
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
fontSize: 15,
},
removeButton: {
color: '#dc2626',
fontWeight: '600',
},
emptyEquipmentContainer: {
padding: 32,
},
emptyEquipmentText: {
color: '#9ca3af',
textAlign: 'center',
fontSize: 14,
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