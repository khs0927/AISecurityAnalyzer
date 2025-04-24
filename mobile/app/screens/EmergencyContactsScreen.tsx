import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type Contact = {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  isPrimary: boolean;
};

const EmergencyContactsScreen = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState<Omit<Contact, 'id'> & { id?: string }>({
    name: '',
    phoneNumber: '',
    relationship: '',
    isPrimary: false,
  });
  const [isAutoAlertEnabled, setIsAutoAlertEnabled] = useState(false);
  const [isPickerModalVisible, setIsPickerModalVisible] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  
  const navigation = useNavigation<StackNavigationProp<any>>();

  // 연락처 로드
  useEffect(() => {
    loadContacts();
    loadSettings();
  }, []);

  const loadContacts = async () => {
    try {
      const storedContacts = await AsyncStorage.getItem('emergencyContacts');
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }
    } catch (error) {
      console.error('연락처 로드 실패:', error);
      Alert.alert('오류', '비상 연락처를 불러오는데 실패했습니다.');
    }
  };

  const loadSettings = async () => {
    try {
      const autoAlertSetting = await AsyncStorage.getItem('autoAlertSetting');
      if (autoAlertSetting) {
        setIsAutoAlertEnabled(JSON.parse(autoAlertSetting));
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
    }
  };

  const saveContacts = async (updatedContacts: Contact[]) => {
    try {
      await AsyncStorage.setItem('emergencyContacts', JSON.stringify(updatedContacts));
    } catch (error) {
      console.error('연락처 저장 실패:', error);
      Alert.alert('오류', '연락처를 저장하는데 실패했습니다.');
    }
  };

  const saveSettings = async (autoAlert: boolean) => {
    try {
      await AsyncStorage.setItem('autoAlertSetting', JSON.stringify(autoAlert));
    } catch (error) {
      console.error('설정 저장 실패:', error);
    }
  };

  const toggleAutoAlert = (value: boolean) => {
    setIsAutoAlertEnabled(value);
    saveSettings(value);
  };

  const addContact = () => {
    setIsEditMode(false);
    setNewContact({
      name: '',
      phoneNumber: '',
      relationship: '',
      isPrimary: false,
    });
    setIsModalVisible(true);
  };

  const editContact = (contact: Contact) => {
    setIsEditMode(true);
    setSelectedContact(contact);
    setNewContact({
      id: contact.id,
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      relationship: contact.relationship,
      isPrimary: contact.isPrimary,
    });
    setIsModalVisible(true);
  };

  const deleteContact = (id: string) => {
    Alert.alert(
      '연락처 삭제',
      '이 연락처를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const updatedContacts = contacts.filter(contact => contact.id !== id);
            setContacts(updatedContacts);
            saveContacts(updatedContacts);
          },
        },
      ]
    );
  };

  const saveContact = () => {
    if (!newContact.name || !newContact.phoneNumber) {
      Alert.alert('알림', '이름과 전화번호는 필수 입력 항목입니다.');
      return;
    }

    let updatedContacts: Contact[];

    if (isEditMode && selectedContact) {
      updatedContacts = contacts.map(contact =>
        contact.id === selectedContact.id
          ? { ...newContact, id: selectedContact.id } as Contact
          : contact
      );
    } else {
      // 기본 연락처 설정 확인
      if (newContact.isPrimary) {
        // 기존 기본 연락처 해제
        updatedContacts = contacts.map(contact => ({
          ...contact,
          isPrimary: false,
        }));
      } else {
        updatedContacts = [...contacts];
      }

      // 새 연락처 추가
      updatedContacts.push({
        ...newContact,
        id: Date.now().toString(),
      } as Contact);
    }

    setContacts(updatedContacts);
    saveContacts(updatedContacts);
    setIsModalVisible(false);
  };

  const pickContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });

        if (data.length > 0) {
          setDeviceContacts(data);
          setIsPickerModalVisible(true);
        } else {
          Alert.alert('알림', '연락처를 찾을 수 없습니다.');
        }
      } else {
        Alert.alert('알림', '연락처 접근 권한이 필요합니다.');
      }
    } catch (error) {
      console.error('연락처 가져오기 실패:', error);
      Alert.alert('오류', '연락처를 가져오는데 실패했습니다.');
    }
  };

  const selectDeviceContact = (contact: Contacts.Contact) => {
    if (contact.name && contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      setNewContact({
        ...newContact,
        name: contact.name,
        phoneNumber: contact.phoneNumbers[0].number.replace(/[- ]/g, ''),
      });
    }
    setIsPickerModalVisible(false);
  };

  const simulateEmergency = () => {
    if (contacts.length === 0) {
      Alert.alert('알림', '등록된 비상 연락처가 없습니다.');
      return;
    }

    const primaryContact = contacts.find(contact => contact.isPrimary);
    const contactToAlert = primaryContact || contacts[0];

    Alert.alert(
      '비상 연락 시뮬레이션',
      `${contactToAlert.name}에게 비상 알림을 보내시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '보내기',
          onPress: () => {
            // 실제 구현에서는 여기에 SMS 전송 또는 전화 다이얼 기능 추가
            Alert.alert('성공', `${contactToAlert.name}님에게 비상 알림이 전송되었습니다.`);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Contact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.isPrimary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryText}>기본</Text>
            </View>
          )}
        </View>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
        {item.relationship && (
          <Text style={styles.contactRelation}>{item.relationship}</Text>
        )}
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => editContact(item)}
        >
          <Ionicons name="create-outline" size={22} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteContact(item.id)}
        >
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>비상 연락처</Text>
          <Text style={styles.subtitle}>
            긴급 상황 발생 시 자동으로 알림을 보낼 연락처를 관리하세요
          </Text>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>자동 비상 알림</Text>
              <Text style={styles.settingDescription}>
                위급 상황이 감지되면 자동으로 연락처에 알림
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#ddd", true: "#007AFF" }}
              thumbColor="#fff"
              ios_backgroundColor="#ddd"
              onValueChange={toggleAutoAlert}
              value={isAutoAlertEnabled}
            />
          </View>
        </View>

        <View style={styles.contactsHeader}>
          <Text style={styles.contactsTitle}>등록된 연락처</Text>
          <TouchableOpacity style={styles.addButton} onPress={addContact}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.addButtonText}>연락처 추가</Text>
          </TouchableOpacity>
        </View>

        {contacts.length > 0 ? (
          <FlatList
            data={contacts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={50} color="#A0A0A0" />
            <Text style={styles.emptyText}>등록된 비상 연락처가 없습니다</Text>
            <Text style={styles.emptySubtext}>
              연락처 추가 버튼을 눌러 비상 연락처를 등록하세요
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={simulateEmergency}
        >
          <Ionicons name="warning-outline" size={24} color="#fff" />
          <Text style={styles.emergencyButtonText}>비상 연락 시뮬레이션</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 연락처 추가/편집 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? '연락처 편집' : '연락처 추가'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.input}
                value={newContact.name}
                onChangeText={(text) => setNewContact({ ...newContact, name: text })}
                placeholder="이름을 입력하세요"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>전화번호</Text>
              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={styles.phoneInput}
                  value={newContact.phoneNumber}
                  onChangeText={(text) => setNewContact({ ...newContact, phoneNumber: text })}
                  placeholder="전화번호를 입력하세요"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={styles.contactPickerButton}
                  onPress={pickContact}
                >
                  <Ionicons name="people" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>관계</Text>
              <TextInput
                style={styles.input}
                value={newContact.relationship}
                onChangeText={(text) => setNewContact({ ...newContact, relationship: text })}
                placeholder="예: 가족, 친구, 주치의 등"
              />
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>기본 연락처로 설정</Text>
              <Switch
                trackColor={{ false: "#ddd", true: "#007AFF" }}
                thumbColor="#fff"
                ios_backgroundColor="#ddd"
                onValueChange={(value) => setNewContact({ ...newContact, isPrimary: value })}
                value={newContact.isPrimary}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveContact}>
              <Text style={styles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 디바이스 연락처 선택 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPickerModalVisible}
        onRequestClose={() => setIsPickerModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>연락처 선택</Text>
              <TouchableOpacity onPress={() => setIsPickerModalVisible(false)}>
                <Ionicons name="close" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={deviceContacts}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.deviceContactItem}
                  onPress={() => selectDeviceContact(item)}
                >
                  <Text style={styles.deviceContactName}>{item.name}</Text>
                  {item.phoneNumbers && item.phoneNumbers.length > 0 && (
                    <Text style={styles.deviceContactPhone}>
                      {item.phoneNumbers[0].number}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#151515',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  settingCard: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#151515',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    maxWidth: '85%',
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  contactsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#151515',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
  },
  contactCard: {
    backgroundColor: '#fff',
    margin: 10,
    marginVertical: 5,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#151515',
  },
  primaryBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  primaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  contactRelation: {
    fontSize: 14,
    color: '#888',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 10,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 30,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#151515',
  },
  formGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#151515',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  contactPickerButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    marginLeft: 10,
    borderRadius: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#151515',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceContactItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceContactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#151515',
  },
  deviceContactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
});

export default EmergencyContactsScreen;