import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  RefreshControl
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { useSmartWatch } from '../contexts/SmartWatchContext';
import { Ionicons } from '@expo/vector-icons';

const SmartWatchScreen = () => {
  const { 
    isConnected,
    connectionStatus,
    deviceInfo,
    data,
    scanForDevices,
    connectToWatch,
    disconnectWatch,
    startHeartRateMonitoring,
    errorMessage,
    isScanning
  } = useSmartWatch();
  
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    if (errorMessage) {
      Alert.alert('오류', errorMessage);
    }
  }, [errorMessage]);
  
  const handleScan = async () => {
    setAvailableDevices([]);
    const devices = await scanForDevices();
    setAvailableDevices(devices);
  };
  
  const handleConnect = async (device: Device) => {
    const success = await connectToWatch(device);
    if (success) {
      startHeartRateMonitoring();
    }
  };
  
  const handleDisconnect = async () => {
    await disconnectWatch();
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await handleScan();
    setRefreshing(false);
  };
  
  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity 
      style={styles.deviceItem}
      onPress={() => handleConnect(item)}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || '이름 없는 기기'}</Text>
        <Text style={styles.deviceId}>ID: {item.id}</Text>
      </View>
      <View style={styles.connectButton}>
        <Ionicons name="bluetooth" size={18} color="#4C6EF5" />
        <Text style={styles.connectText}>연결</Text>
      </View>
    </TouchableOpacity>
  );
  
  const renderConnectedDevice = () => (
    <View style={styles.connectedDevice}>
      <View style={styles.deviceHeader}>
        <View style={styles.deviceInfo}>
          <Text style={styles.connectedTitle}>연결된 기기</Text>
          <Text style={styles.deviceName}>{deviceInfo?.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.disconnectButton}
          onPress={handleDisconnect}
        >
          <Text style={styles.disconnectText}>연결 해제</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.healthData}>
        <View style={styles.dataItem}>
          <Ionicons name="heart" size={28} color="#FF5E5B" />
          <View>
            <Text style={styles.dataValue}>
              {data.heartRate ? `${data.heartRate} BPM` : '-'}
            </Text>
            <Text style={styles.dataLabel}>심박수</Text>
          </View>
        </View>
        
        <View style={styles.dataItem}>
          <Ionicons name="water" size={28} color="#4C6EF5" />
          <View>
            <Text style={styles.dataValue}>
              {data.oxygenLevel ? `${data.oxygenLevel}%` : '-'}
            </Text>
            <Text style={styles.dataLabel}>산소포화도</Text>
          </View>
        </View>
        
        <View style={styles.dataItem}>
          <Ionicons name="battery-full" size={28} color={
            data.batteryLevel && data.batteryLevel < 20 ? '#FF5E5B' :
            data.batteryLevel && data.batteryLevel < 50 ? '#FFD166' : '#06D6A0'
          } />
          <View>
            <Text style={styles.dataValue}>
              {data.batteryLevel ? `${data.batteryLevel}%` : '-'}
            </Text>
            <Text style={styles.dataLabel}>배터리</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.lastUpdated}>
        <Text style={styles.lastUpdatedText}>
          마지막 업데이트: {data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleTimeString() 
            : '업데이트 없음'}
        </Text>
      </View>
    </View>
  );
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>스마트워치 연결</Text>
        <Text style={styles.subtitle}>
          건강 데이터 모니터링을 위해 스마트워치를 연결하세요
        </Text>
      </View>
      
      {isConnected && deviceInfo ? (
        renderConnectedDevice()
      ) : (
        <View style={styles.scanSection}>
          <TouchableOpacity 
            style={styles.scanButton} 
            onPress={handleScan}
            disabled={isScanning}
          >
            <Text style={styles.scanButtonText}>
              {isScanning ? '스캔 중...' : '기기 검색'}
            </Text>
            {isScanning && (
              <ActivityIndicator color="#fff" style={{ marginLeft: 10 }} />
            )}
          </TouchableOpacity>
          
          {Platform.OS === 'android' && (
            <Text style={styles.permissionText}>
              * 안드로이드에서는 위치 권한이 필요합니다
            </Text>
          )}
          
          {availableDevices.length > 0 ? (
            <View style={styles.deviceList}>
              <Text style={styles.deviceListTitle}>사용 가능한 기기</Text>
              <FlatList
                data={availableDevices}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.deviceListContent}
              />
            </View>
          ) : !isScanning && availableDevices.length === 0 ? (
            <View style={styles.noDevices}>
              <Ionicons name="bluetooth-outline" size={60} color="#ccc" />
              <Text style={styles.noDevicesText}>기기를 찾을 수 없습니다</Text>
              <Text style={styles.noDevicesSubtext}>
                스마트워치의 블루투스가 켜져 있는지 확인하세요
              </Text>
            </View>
          ) : null}
        </View>
      )}
      
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>도움말</Text>
        <View style={styles.helpItem}>
          <Ionicons name="information-circle" size={22} color="#4C6EF5" style={styles.helpIcon} />
          <Text style={styles.helpText}>
            스마트워치가 연결되면 심박수, 산소포화도 등의 데이터가 실시간으로 업데이트됩니다.
          </Text>
        </View>
        <View style={styles.helpItem}>
          <Ionicons name="battery-full" size={22} color="#4C6EF5" style={styles.helpIcon} />
          <Text style={styles.helpText}>
            스마트워치의 배터리가 20% 이하로 떨어지면 알림이 표시됩니다.
          </Text>
        </View>
        <View style={styles.helpItem}>
          <Ionicons name="bluetooth" size={22} color="#4C6EF5" style={styles.helpIcon} />
          <Text style={styles.helpText}>
            기기 연결 시 블루투스가 켜져 있어야 합니다.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  scanSection: {
    padding: 20,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#4C6EF5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 20,
  },
  deviceList: {
    width: '100%',
    marginTop: 20,
  },
  deviceListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#212529',
  },
  deviceListContent: {
    paddingBottom: 20,
  },
  deviceItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#6c757d',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectText: {
    color: '#4C6EF5',
    fontWeight: '600',
    marginLeft: 6,
  },
  noDevices: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noDevicesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
    marginTop: 16,
  },
  noDevicesSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
  connectedDevice: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  connectedTitle: {
    fontSize: 14,
    color: '#4C6EF5',
    fontWeight: '600',
    marginBottom: 4,
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  disconnectText: {
    color: '#dc3545',
    fontWeight: '600',
    fontSize: 14,
  },
  healthData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dataItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 10,
  },
  dataValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 8,
    marginBottom: 2,
  },
  dataLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  lastUpdated: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  helpSection: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212529',
  },
  helpItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  helpIcon: {
    marginRight: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
});

export default SmartWatchScreen; 