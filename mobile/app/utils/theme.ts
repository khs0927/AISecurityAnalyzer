/**
 * 앱 전체에서 사용할 테마 설정
 */

export const COLORS = {
  // 주요 색상
  primary: '#FF6D94',        // 메인 핑크 (심장 건강 앱의 테마 색상)
  secondary: '#6C7A89',      // 부 색상
  accent: '#FF9EB1',         // 강조 색상
  
  // 기능적 색상
  success: '#2ECC71',        // 성공
  info: '#3498DB',           // 정보
  warning: '#F39C12',        // 경고
  danger: '#E74C3C',         // 위험
  emergency: '#C0392B',      // 응급
  
  // 중립 색상
  black: '#000000',
  darkGray: '#333333',
  mediumGray: '#666666',
  lightGray: '#999999',
  ultraLightGray: '#F0F0F0',
  white: '#FFFFFF',
  
  // 배경 색상
  background: '#FFFFFF',
  cardBackground: '#FFFFFF',
  screenBackground: '#F8F9FA',
  
  // 기타 색상
  heartRate: '#FF6D94',      // 심박수 측정 색상
  bloodPressure: '#3498DB',  // 혈압 색상
  oxygen: '#2ECC71',         // 산소 포화도 색상
};

export const FONT_SIZES = {
  xs: 10,
  small: 12,
  medium: 14,
  regular: 16,
  large: 18,
  xl: 20,
  xxl: 24,
  title: 28,
  headline: 32,
};

export const FONT_WEIGHTS = {
  light: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};

export const SPACING = {
  xs: 4,
  small: 8,
  medium: 12,
  regular: 16,
  large: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  small: 4,
  regular: 8,
  large: 12,
  xl: 16,
  round: 50,
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
}; 