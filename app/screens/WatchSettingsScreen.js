import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppleWatchIcon, GalaxyWatchIcon, MiBandIcon } from '../assets/watch-icon-placeholder';

// firebase 모듈이 없을 경우를 위한 임시 구현
const firebase = {
  auth: () => ({
    currentUser: { uid: '1234567890' }
  }),
  firestore: () => ({
    FieldValue: {
      serverTimestamp: () => new Date().toISOString()
    },
    doc: (path) => ({
      get: async () => ({
        exists: true,
        data: () => ({
          type: 'apple',
          autoSync: true,
          notifications: true,
          healthDataSharing: true,
          syncInterval: '5'
        })
      }),
      set: async (data, options) => {
        console.log('설정 저장됨:', data);
        return Promise.resolve();
      }
    })
  })
};

const WatchSettingsScreen = ({ webAppData, refreshData, loading }) => {
  const navigation = useNavigation();
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [watchType, setWatchType] = useState(null); // 'apple', 'samsung', 'xiaomi', null
  const [autoSync, setAutoSync] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [healthDataSharing, setHealthDataSharing] = useState(true);
  const [syncInterval, setSyncInterval] = useState('5'); // 분 단위
  
  // 스마트워치 연결 상태 (webAppData에서 가져오거나 로컬 상태)
  const [isWatchConnected, setIsWatchConnected] = useState(false);
  
  useEffect(() => {
    // webAppData에서 연결 상태 업데이트
    if (webAppData && webAppData.watchConnected) {
      setIsWatchConnected(webAppData.watchConnected);
    }
    
    // 관련 앱 설치 여부 확인
    checkWatchAppInstalled();
    
    // Firebase에서 설정 불러오기
    loadWatchSettings();
  }, [webAppData]);
  
  // 스마트워치 앱 설치 여부 확인
  const checkWatchAppInstalled = async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS - 애플 헬스 확인 (항상 설치되어 있음)
        setIsAppInstalled(true);
        setWatchType('apple');
      } else if (Platform.OS === 'android') {
        // Android - Samsung Health 또는 Mi Fit 확인
        // 실제 앱에서는 Application.getInstalledApplicationsAsync() 사용
        // 현재는 시뮬레이션
        setTimeout(() => {
          setIsAppInstalled(true);
          setWatchType('samsung'); // 혹은 사용자 선택에 따라
        }, 500);
      }
    } catch (error) {
      console.error('앱 설치 확인 오류:', error);
    }
  };
  
  // Firebase에서 설정 불러오기
  const loadWatchSettings = async () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
      const doc = await firebase.firestore()
        .doc(`users/${user.uid}/settings/watch`)
        .get();
        
      if (doc.exists) {
        const data = doc.data();
        setWatchType(data.type || null);
        setAutoSync(data.autoSync !== false);
        setNotificationsEnabled(data.notifications !== false);
        setHealthDataSharing(data.healthDataSharing !== false);
        setSyncInterval(data.syncInterval || '5');
      }
    } catch (error) {
      console.error('설정 불러오기 오류:', error);
    }
  };
  
  // 설정 저장
  const saveSettings = async () => {
    const user = firebase.auth().currentUser;
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    
    try {
      await firebase.firestore()
        .doc(`users/${user.uid}/settings/watch`)
        .set({
          type: watchType,
          autoSync,
          notifications: notificationsEnabled,
          healthDataSharing,
          syncInterval,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
      Alert.alert('성공', '스마트워치 설정이 저장되었습니다.');
    } catch (error) {
      console.error('설정 저장 오류:', error);
      Alert.alert('오류', '설정을 저장하는 중 오류가 발생했습니다.');
    }
  };
  
  // 스마트워치 연결
  const connectWatch = () => {
    setIsConnecting(true);
    
    // 스마트워치 연결 시뮬레이션
    setTimeout(() => {
      setIsConnecting(false);
      setIsWatchConnected(true);
      
      Alert.alert(
        '연결 성공',
        '스마트워치가 성공적으로 연결되었습니다.',
        [{ text: '확인' }]
      );
    }, 2000);
  };
  
  // 스마트워치 연결 해제
  const disconnectWatch = () => {
    Alert.alert(
      '연결 해제',
      '스마트워치 연결을 해제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '해제', 
          style: 'destructive',
          onPress: () => {
            setIsWatchConnected(false);
            Alert.alert('알림', '스마트워치 연결이 해제되었습니다.');
          }
        }
      ]
    );
  };
  
  // 앱 설치 안내
  const promptAppInstall = () => {
    let appName, appLink;
    
    if (Platform.OS === 'ios') {
      appName = 'Apple 건강';
      appLink = 'https://apps.apple.com/kr/app/health/id1242545199';
    } else if (watchType === 'samsung' || !watchType) {
      appName = 'Samsung Health';
      appLink = 'market://details?id=com.sec.android.app.shealth';
    } else if (watchType === 'xiaomi') {
      appName = 'Mi Fit';
      appLink = 'market://details?id=com.xiaomi.hm.health';
    }
    
    Alert.alert(
      '앱 설치 필요',
      `${appName} 앱이 필요합니다. 앱을 설치하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '설치', 
          onPress: () => Linking.openURL(appLink).catch(err => {
            Alert.alert('오류', '앱 스토어를 열 수 없습니다.');
          }) 
        }
      ]
    );
  };
  
  // 스마트워치 유형 선택
  const selectWatchType = (type) => {
    setWatchType(type);
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>스마트워치 설정</Text>
          <View style={styles.headerRight} />
        </View>
        
        <ScrollView style={styles.content}>
          {/* 연결 상태 */}
          <View style={styles.connectionCard}>
            <View style={styles.connectionHeader}>
              <Ionicons name="watch" size={24} color="#FF6D94" />
              <Text style={styles.connectionTitle}>스마트워치 연결</Text>
            </View>
            
            <View style={styles.connectionStatus}>
              <View style={[
                styles.statusIndicator,
                isWatchConnected ? styles.statusConnected : styles.statusDisconnected
              ]} />
              <Text style={styles.statusText}>
                {isWatchConnected ? '연결됨' : '연결되지 않음'}
              </Text>
            </View>
            
            {isWatchConnected ? (
              <TouchableOpacity 
                style={styles.disconnectButton}
                onPress={disconnectWatch}
              >
                <Text style={styles.disconnectButtonText}>연결 해제</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.connectButton}
                onPress={isAppInstalled ? connectWatch : promptAppInstall}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.connectButtonText}>
                    {isAppInstalled ? '연결하기' : '앱 설치 필요'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          {/* 워치 선택 */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>스마트워치 선택</Text>
            <Text style={styles.sectionDescription}>
              사용 중인 스마트워치를 선택하세요. 모델에 따라 연동 방식이 다를 수 있습니다.
            </Text>
            
            <View style={styles.watchTypeContainer}>
              <TouchableOpacity 
                style={[
                  styles.watchTypeButton,
                  watchType === 'apple' && styles.watchTypeButtonSelected
                ]}
                onPress={() => selectWatchType('apple')}
                disabled={Platform.OS !== 'ios'}
              >
                <AppleWatchIcon />
                <Text style={styles.watchTypeText}>Apple Watch</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.watchTypeButton,
                  watchType === 'samsung' && styles.watchTypeButtonSelected
                ]}
                onPress={() => selectWatchType('samsung')}
              >
                <GalaxyWatchIcon />
                <Text style={styles.watchTypeText}>Galaxy Watch</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.watchTypeButton,
                  watchType === 'xiaomi' && styles.watchTypeButtonSelected
                ]}
                onPress={() => selectWatchType('xiaomi')}
              >
                <MiBandIcon />
                <Text style={styles.watchTypeText}>Mi Band</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* 설정 옵션 */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>동기화 설정</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemInfo}>
                <Text style={styles.settingItemTitle}>자동 동기화</Text>
                <Text style={styles.settingItemDescription}>앱 실행 시 데이터 자동 동기화</Text>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: '#f0f0f0', true: '#FFCAD4' }}
                thumbColor={autoSync ? '#FF6D94' : '#999'}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemInfo}>
                <Text style={styles.settingItemTitle}>알림 허용</Text>
                <Text style={styles.settingItemDescription}>심박수 이상 시 스마트워치 알림</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#f0f0f0', true: '#FFCAD4' }}
                thumbColor={notificationsEnabled ? '#FF6D94' : '#999'}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemInfo}>
                <Text style={styles.settingItemTitle}>건강 데이터 공유</Text>
                <Text style={styles.settingItemDescription}>의료 AI에 데이터 제공 (향상된 분석)</Text>
              </View>
              <Switch
                value={healthDataSharing}
                onValueChange={setHealthDataSharing}
                trackColor={{ false: '#f0f0f0', true: '#FFCAD4' }}
                thumbColor={healthDataSharing ? '#FF6D94' : '#999'}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemInfo}>
                <Text style={styles.settingItemTitle}>동기화 주기</Text>
                <Text style={styles.settingItemDescription}>백그라운드에서 데이터를 가져오는 주기</Text>
              </View>
              <View style={styles.syncIntervalButtons}>
                {['5', '10', '15', '30'].map(interval => (
                  <TouchableOpacity
                    key={interval}
                    style={[
                      styles.syncIntervalButton,
                      syncInterval === interval && styles.syncIntervalButtonSelected
                    ]}
                    onPress={() => setSyncInterval(interval)}
                  >
                    <Text style={[
                      styles.syncIntervalText,
                      syncInterval === interval && styles.syncIntervalTextSelected
                    ]}>
                      {interval}분
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          
          {/* 지원 스마트워치 */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>지원 스마트워치 모델</Text>
            <Text style={styles.sectionDescription}>
              다음 모델을 지원합니다. 다른 모델은 일부 기능이 제한될 수 있습니다.
            </Text>
            
            <View style={styles.supportedModelList}>
              <View style={styles.supportedModelGroup}>
                <Text style={styles.supportedModelGroupTitle}>Apple Watch</Text>
                <Text style={styles.supportedModelText}>• Apple Watch Series 3 이상</Text>
                <Text style={styles.supportedModelText}>• Apple Watch SE</Text>
                <Text style={styles.supportedModelText}>• watchOS 7.0 이상</Text>
              </View>
              
              <View style={styles.supportedModelGroup}>
                <Text style={styles.supportedModelGroupTitle}>Samsung Galaxy Watch</Text>
                <Text style={styles.supportedModelText}>• Galaxy Watch 3/4/5/6</Text>
                <Text style={styles.supportedModelText}>• Galaxy Watch Active/Active 2</Text>
                <Text style={styles.supportedModelText}>• Wear OS 3.0 이상</Text>
              </View>
              
              <View style={styles.supportedModelGroup}>
                <Text style={styles.supportedModelGroupTitle}>Xiaomi</Text>
                <Text style={styles.supportedModelText}>• Mi Band 6/7/8</Text>
                <Text style={styles.supportedModelText}>• Amazfit GTS/GTR 시리즈</Text>
              </View>
            </View>
          </View>
          
          {/* 저장 버튼 */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={saveSettings}
          >
            <Text style={styles.saveButtonText}>설정 저장</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  connectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#FF5252',
  },
  statusText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#FF6D94',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disconnectButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  watchTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  watchTypeButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    width: '30%',
  },
  watchTypeButtonSelected: {
    borderColor: '#FF6D94',
    backgroundColor: '#FFF0F5',
  },
  watchTypeIcon: {
    width: 50,
    height: 50,
    marginBottom: 8,
  },
  watchTypeText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemInfo: {
    flex: 1,
    paddingRight: 10,
  },
  settingItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  settingItemDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },
  syncIntervalButtons: {
    flexDirection: 'row',
  },
  syncIntervalButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 6,
  },
  syncIntervalButtonSelected: {
    borderColor: '#FF6D94',
    backgroundColor: '#FF6D94',
  },
  syncIntervalText: {
    fontSize: 12,
    color: '#666',
  },
  syncIntervalTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  supportedModelList: {
    marginTop: 5,
  },
  supportedModelGroup: {
    marginBottom: 12,
  },
  supportedModelGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  supportedModelText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#FF6D94',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginVertical: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default WatchSettingsScreen; 