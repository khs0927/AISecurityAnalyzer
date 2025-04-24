import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Context Providers
import SmartWatchProvider from './app/contexts/SmartWatchContext';

// Screens
import SmartWatchScreen from './app/screens/SmartWatchScreen';
import HomeScreen from './app/screens/HomeScreen';
import SettingsScreen from './app/screens/SettingsScreen';
import HealthDataScreen from './app/screens/HealthDataScreen';
import AiConsultationScreen from './app/screens/AiConsultationScreen';

// 개발 모드에서 특정 경고 무시
LogBox.ignoreLogs([
  'ReactNativeBLE',  // BLE 관련 경고 무시
  '[react-native-gesture-handler]', // 제스처 핸들러 관련 경고 무시
]);

// 타입 정의
type TabParamList = {
  Home: undefined;
  'Smart Watch': undefined;
  'Health Data': undefined;
  'AI Consultation': undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const App = () => {
  return (
    <NavigationContainer>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        <SmartWatchProvider>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: string = '';
                
                if (route.name === 'Home') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Smart Watch') {
                  iconName = focused ? 'watch' : 'watch-outline';
                } else if (route.name === 'Health Data') {
                  iconName = focused ? 'pulse' : 'pulse-outline';
                } else if (route.name === 'AI Consultation') {
                  iconName = focused ? 'medical' : 'medical-outline';
                } else if (route.name === 'Settings') {
                  iconName = focused ? 'settings' : 'settings-outline';
                }
                
                return <Ionicons name={iconName as any} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#FF0000',
              tabBarInactiveTintColor: 'gray',
              headerShown: true,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            })}
          >
            <Tab.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ title: '홈' }}
            />
            <Tab.Screen 
              name="Smart Watch" 
              component={SmartWatchScreen} 
              options={{ title: '스마트워치' }}
            />
            <Tab.Screen 
              name="Health Data" 
              component={HealthDataScreen} 
              options={{ title: '건강 데이터' }}
            />
            <Tab.Screen 
              name="AI Consultation" 
              component={AiConsultationScreen} 
              options={{ title: 'AI 상담' }}
            />
            <Tab.Screen 
              name="Settings" 
              component={SettingsScreen} 
              options={{ title: '설정' }}
            />
          </Tab.Navigator>
        </SmartWatchProvider>
      </SafeAreaView>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App;