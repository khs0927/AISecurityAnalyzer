import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { monitoring } from '../utils/monitoring';
import { db } from '../db/database';

// 요청 객체에 사용자 정보를 추가하기 위한 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        permissions?: string[];
      };
    }
  }
}

/**
 * JWT 토큰 검증 미들웨어
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: '인증 토큰이 필요합니다'
      });
    }
    
    // Bearer 토큰 형식 확인
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: '인증 형식이 올바르지 않습니다'
      });
    }
    
    const token = parts[1];
    
    // 토큰 검증
    const decoded = jwt.verify(token, config.security.jwtSecret) as any;
    
    // 사용자 데이터베이스 조회 (캐시 사용 고려)
    const result = await db.query(
      'SELECT id, email, role, active FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }
    
    const user = result.rows[0];
    
    // 사용자 계정 상태 확인
    if (!user.active) {
      return res.status(401).json({
        success: false,
        error: '비활성화된 계정입니다'
      });
    }
    
    // 사용자 정보 요청에 저장
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    // 권한 정보 로드 (필요한 경우)
    if (['admin', 'moderator'].includes(user.role)) {
      const permissionsResult = await db.query(
        `SELECT p.name
         FROM permissions p
         JOIN user_permissions up ON p.id = up.permission_id
         WHERE up.user_id = $1`,
        [user.id]
      );
      
      const permissions = permissionsResult.rows.map(row => row.name);
      req.user.permissions = permissions;
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰입니다'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '만료된 토큰입니다'
      });
    }
    
    monitoring.log('security', 'error', `인증 오류: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: '인증 처리 중 오류가 발생했습니다'
    });
  }
};

/**
 * 특정 역할이 필요한 라우트에 대한 미들웨어
 * @param roles 허용되는 역할 배열
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '인증되지 않았습니다'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: '이 작업을 수행할 권한이 없습니다'
      });
    }
    
    next();
  };
};

/**
 * 특정 권한이 필요한 라우트에 대한 미들웨어
 * @param permissions 필요한 권한 배열
 */
export const requirePermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '인증되지 않았습니다'
      });
    }
    
    // 관리자는 모든 권한을 가짐
    if (req.user.role === 'admin') {
      return next();
    }
    
    // 권한 목록이 없는 경우
    if (!req.user.permissions) {
      return res.status(403).json({
        success: false,
        error: '이 작업을 수행할 권한이 없습니다'
      });
    }
    
    // 필요한 권한 중 하나라도 가지고 있는지 확인
    const hasPermission = permissions.some(permission => 
      req.user!.permissions!.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: '이 작업을 수행할 권한이 없습니다'
      });
    }
    
    next();
  };
};

/**
 * 본인 또는 관리자 권한이 필요한 라우트에 대한 미들웨어
 * @param userIdParam 사용자 ID가 저장된 URL 파라미터 이름
 */
export const requireSelfOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '인증되지 않았습니다'
      });
    }
    
    const paramUserId = parseInt(req.params[userIdParam], 10);
    
    // 관리자이거나 자신의 리소스에 접근하는 경우
    if (req.user.role === 'admin' || req.user.id === paramUserId) {
      return next();
    }
    
    res.status(403).json({
      success: false,
      error: '이 작업을 수행할 권한이 없습니다'
    });
  };
};

/**
 * JWT 토큰 생성 함수
 * @param userId 사용자 ID
 * @param email 사용자 이메일
 * @param role 사용자 역할
 */
export const generateToken = (userId: number, email: string, role: string): string => {
  return jwt.sign(
    { userId, email, role },
    config.security.jwtSecret,
    { expiresIn: config.security.jwtExpiresIn }
  );
};

/**
 * 토큰 만료 시간 계산 함수
 * @param token JWT 토큰
 */
export const getTokenExpiration = (token: string): Date => {
  const decoded = jwt.decode(token) as any;
  return new Date(decoded.exp * 1000);
};

/**
 * CSRF 토큰 검증 미들웨어
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // CSRF 보호가 비활성화되어 있으면 건너뜀
  if (!config.security.csrfProtection) {
    return next();
  }
  
  // GET 요청은 안전하므로 건너뜀
  if (req.method === 'GET') {
    return next();
  }
  
  const csrfToken = req.headers['x-csrf-token'] as string;
  const storedToken = req.session?.csrfToken;
  
  if (!csrfToken || !storedToken || csrfToken !== storedToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF 토큰이 유효하지 않습니다'
    });
  }
  
  next();
}; 