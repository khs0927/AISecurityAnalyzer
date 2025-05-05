import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  FlatList,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

const NearbyHospitalsScreen = () => {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hospitals, setHospitals] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('emergency'); // 'emergency', 'hospital', 'pharmacy'
  const [searchQuery, setSearchQuery] = useState('');
  const webViewRef = useRef(null);
  
  // 현재 위치 가져오기
  useEffect(() => {
    (async () => {
      try {
        // 위치 권한 요청
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('위치 접근 권한이 거부되었습니다');
          setIsLoading(false);
          return;
        }

        // 현재 위치 가져오기
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(location);
        
        // 근처 병원 정보 불러오기 (실제 구현에서는 API 호출)
        await fetchNearbyHospitals(location, selectedCategory);
      } catch (error) {
        console.error('위치 가져오기 오류:', error);
        setErrorMsg('위치 정보를 가져오는 데 실패했습니다');
        setIsLoading(false);
      }
    })();
  }, [selectedCategory]);
  
  // 지도 HTML 생성 함수
  const generateMapHTML = (latitude, longitude, places) => {
    const markersCode = places.map((place, index) => 
      `
      var marker${index} = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(${place.y}, ${place.x}),
        map: map
      });
      
      var infowindow${index} = new kakao.maps.InfoWindow({
        content: '<div style="padding:5px;width:150px;text-align:center;font-size:12px;">${place.place_name}<br><a href="https://map.kakao.com/link/to/${place.place_name},${place.y},${place.x}" style="color:blue" target="_blank">길찾기</a></div>'
      });
      
      kakao.maps.event.addListener(marker${index}, 'click', function() {
        infowindow${index}.open(map, marker${index});
      });
      `
    ).join('\n');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>주변 의료시설</title>
        <style>
          body { margin: 0; padding: 0; height: 100%; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_KAKAO_MAP_API_KEY&libraries=services"></script>
        <script>
          var container = document.getElementById('map');
          var options = {
            center: new kakao.maps.LatLng(${latitude}, ${longitude}),
            level: 4
          };
          
          var map = new kakao.maps.Map(container, options);
          
          // 현재 위치 마커
          var currentMarker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(${latitude}, ${longitude}),
            map: map
          });
          
          var currentInfowindow = new kakao.maps.InfoWindow({
            content: '<div style="padding:5px;width:150px;text-align:center;font-size:12px;">현재 위치</div>'
          });
          
          currentInfowindow.open(map, currentMarker);
          
          // 주변 의료시설 마커
          ${markersCode}
        </script>
      </body>
      </html>
    `;
  };
  
  // 근처 병원 정보 가져오기 (더미 데이터 사용)
  const fetchNearbyHospitals = async (location, category) => {
    setIsLoading(true);
    
    try {
      // 실제 구현에서는 서버 API 또는 카카오 API 호출
      // 지금은 더미 데이터 사용
      setTimeout(() => {
        const dummyHospitals = {
          emergency: [
            {
              id: 'e1',
              place_name: '서울대학교병원 응급의료센터',
              distance: '1.2km',
              phone: '02-2072-2196',
              address: '서울특별시 종로구 대학로 101',
              open_now: true,
              x: 126.997,
              y: 37.5809,
              place_url: 'http://place.map.kakao.com/8578406'
            },
            {
              id: 'e2',
              place_name: '서울아산병원 응급실',
              distance: '2.5km',
              phone: '02-3010-3333',
              address: '서울특별시 송파구 올림픽로 43길 88',
              open_now: true,
              x: 127.0847,
              y: 37.5269,
              place_url: 'http://place.map.kakao.com/8093408'
            },
            {
              id: 'e3',
              place_name: '삼성서울병원 응급의료센터',
              distance: '3.1km',
              phone: '02-3410-2060',
              address: '서울특별시 강남구 일원로 81',
              open_now: true,
              x: 127.0844,
              y: 37.4888,
              place_url: 'http://place.map.kakao.com/7932695'
            }
          ],
          hospital: [
            {
              id: 'h1',
              place_name: '서울성모병원',
              distance: '1.5km',
              phone: '02-1588-1511',
              address: '서울특별시 서초구 반포대로 222',
              open_now: true,
              x: 127.0037,
              y: 37.5018,
              place_url: 'http://place.map.kakao.com/8168450'
            },
            {
              id: 'h2',
              place_name: '연세대학교 세브란스병원',
              distance: '2.1km',
              phone: '02-1599-1004',
              address: '서울특별시 서대문구 연세로 50-1',
              open_now: true,
              x: 126.9403,
              y: 37.5622,
              place_url: 'http://place.map.kakao.com/8141522'
            },
            {
              id: 'h3',
              place_name: '고려대학교 안암병원',
              distance: '2.4km',
              phone: '02-920-5114',
              address: '서울특별시 성북구 인촌로 73',
              open_now: true,
              x: 127.0267,
              y: 37.5874,
              place_url: 'http://place.map.kakao.com/8053037'
            }
          ],
          pharmacy: [
            {
              id: 'p1',
              place_name: '하나약국',
              distance: '0.3km',
              phone: '02-123-4567',
              address: '서울특별시 종로구 새문안로 12',
              open_now: true,
              x: 126.9835,
              y: 37.5723,
              place_url: 'http://place.map.kakao.com/1234567'
            },
            {
              id: 'p2',
              place_name: '연세온누리약국',
              distance: '0.5km',
              phone: '02-765-4321',
              address: '서울특별시 서대문구 연세로 8-1',
              open_now: false,
              x: 126.9432,
              y: 37.5585,
              place_url: 'http://place.map.kakao.com/7654321'
            },
            {
              id: 'p3',
              place_name: '24시 열린약국',
              distance: '0.7km',
              phone: '02-987-6543',
              address: '서울특별시 중구 명동길 14',
              open_now: true,
              x: 126.9856,
              y: 37.5632,
              place_url: 'http://place.map.kakao.com/3456789'
            }
          ]
        };
        
        setHospitals(dummyHospitals[category]);
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('병원 정보 가져오기 오류:', error);
      setErrorMsg('주변 병원 정보를 불러오는 데 실패했습니다');
      setIsLoading(false);
    }
  };
  
  // 카테고리 변경 핸들러
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };
  
  // 전화 걸기
  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };
  
  // 길찾기
  const handleNavigation = (place) => {
    const scheme = Platform.select({
      ios: 'kakaomap://route?sp=${location.coords.latitude},${location.coords.longitude}&ep=${place.y},${place.x}&by=FOOT',
      android: 'kakaomap://route?sp=${location.coords.latitude},${location.coords.longitude}&ep=${place.y},${place.x}&by=FOOT'
    });
    
    Linking.openURL(scheme).catch(() => {
      // 카카오맵 앱이 없는 경우 웹으로 열기
      Linking.openURL(`https://map.kakao.com/link/to/${place.place_name},${place.y},${place.x}`);
    });
  };
  
  // 위치 정보 다시 가져오기
  const refreshLocation = async () => {
    setIsLoading(true);
    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(location);
      await fetchNearbyHospitals(location, selectedCategory);
    } catch (error) {
      console.error('위치 갱신 오류:', error);
      setErrorMsg('위치 정보를 갱신하는 데 실패했습니다');
      setIsLoading(false);
    }
  };
  
  // 병원 아이템 렌더링
  const renderHospitalItem = ({ item }) => (
    <View style={styles.hospitalItem}>
      <View style={styles.hospitalInfo}>
        <Text style={styles.hospitalName}>{item.place_name}</Text>
        <Text style={styles.hospitalAddress}>{item.address}</Text>
        <View style={styles.hospitalMetaInfo}>
          <View style={styles.hospitalDistance}>
            <Ionicons name="location" size={14} color="#888" />
            <Text style={styles.hospitalMetaText}>{item.distance}</Text>
          </View>
          <View style={[
            styles.hospitalStatus, 
            { backgroundColor: item.open_now ? '#4CAF50' : '#FF5252' }
          ]}>
            <Text style={styles.hospitalStatusText}>
              {item.open_now ? '영업 중' : '영업 종료'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.hospitalActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleCall(item.phone)}
        >
          <Ionicons name="call" size={20} color="#FF6D94" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleNavigation(item)}
        >
          <Ionicons name="navigate" size={20} color="#4285F4" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  let mapContent = <ActivityIndicator size="large" color="#FF6D94" />;
  
  if (errorMsg) {
    mapContent = (
      <View style={styles.centerContainer}>
        <Ionicons name="warning" size={48} color="#FF5252" />
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={refreshLocation}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (location && hospitals.length > 0) {
    mapContent = (
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML(location.coords.latitude, location.coords.longitude, hospitals) }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
        }}
      />
    );
  }
  
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
          <Text style={styles.headerTitle}>주변 의료시설</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={refreshLocation}
            disabled={isLoading}
          >
            <Ionicons 
              name="refresh" 
              size={24} 
              color={isLoading ? "#ccc" : "#333"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* 카테고리 선택 */}
        <View style={styles.categories}>
          <TouchableOpacity 
            style={[
              styles.categoryButton, 
              selectedCategory === 'emergency' && styles.categoryButtonActive
            ]}
            onPress={() => handleCategoryChange('emergency')}
          >
            <Ionicons 
              name="medkit" 
              size={18} 
              color={selectedCategory === 'emergency' ? "#fff" : "#555"} 
            />
            <Text 
              style={[
                styles.categoryText, 
                selectedCategory === 'emergency' && styles.categoryTextActive
              ]}
            >
              응급실
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.categoryButton, 
              selectedCategory === 'hospital' && styles.categoryButtonActive
            ]}
            onPress={() => handleCategoryChange('hospital')}
          >
            <Ionicons 
              name="home" 
              size={18} 
              color={selectedCategory === 'hospital' ? "#fff" : "#555"} 
            />
            <Text 
              style={[
                styles.categoryText, 
                selectedCategory === 'hospital' && styles.categoryTextActive
              ]}
            >
              병원
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.categoryButton, 
              selectedCategory === 'pharmacy' && styles.categoryButtonActive
            ]}
            onPress={() => handleCategoryChange('pharmacy')}
          >
            <Ionicons 
              name="flask" 
              size={18} 
              color={selectedCategory === 'pharmacy' ? "#fff" : "#555"} 
            />
            <Text 
              style={[
                styles.categoryText, 
                selectedCategory === 'pharmacy' && styles.categoryTextActive
              ]}
            >
              약국
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* 검색창 */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`${selectedCategory === 'emergency' ? '응급실' : selectedCategory === 'hospital' ? '병원' : '약국'} 검색...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* 지도와 목록 뷰 */}
        <View style={styles.contentContainer}>
          {/* 지도 */}
          <View style={styles.mapContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6D94" />
                <Text style={styles.loadingText}>
                  {selectedCategory === 'emergency' ? '응급실' : selectedCategory === 'hospital' ? '병원' : '약국'} 정보를 불러오는 중...
                </Text>
              </View>
            ) : (
              mapContent
            )}
          </View>
          
          {/* 목록 */}
          <View style={styles.listContainer}>
            <FlatList
              data={hospitals.filter(hospital => 
                hospital.place_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                hospital.address.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              renderItem={renderHospitalItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={styles.emptyListContainer}>
                  <Ionicons name="search" size={48} color="#ccc" />
                  <Text style={styles.emptyListText}>검색 결과가 없습니다</Text>
                </View>
              }
            />
          </View>
        </View>
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
  refreshButton: {
    padding: 5,
  },
  categories: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
  },
  categoryButtonActive: {
    backgroundColor: '#FF6D94',
  },
  categoryText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 5,
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  contentContainer: {
    flex: 1,
  },
  mapContainer: {
    height: '50%',
    backgroundColor: '#f0f0f0',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#FF6D94',
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hospitalItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  hospitalMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hospitalDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  hospitalMetaText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  hospitalStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hospitalStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  hospitalActions: {
    justifyContent: 'space-around',
    paddingLeft: 10,
  },
  actionButton: {
    padding: 8,
  },
  emptyListContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListText: {
    marginTop: 10,
    fontSize: 16,
    color: '#888',
  },
});

export default NearbyHospitalsScreen; 