import { PrismaClient } from '@prisma/client';

// 환경에 따른 연결 설정
const getConnectionString = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL || '';
  }
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nottoday';
};

// Prisma 클라이언트 초기화
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getConnectionString(),
    },
  },
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
});

// 데이터베이스 연결 테스트
export const testConnection = async () => {
  try {
    await prisma.$connect();
    console.log('Successfully connected to Supabase PostgreSQL database');
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return false;
  }
}; 