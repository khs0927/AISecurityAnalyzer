import { Request, Response, NextFunction } from 'express';
import path from 'path';

/**
 * 보안 미들웨어: 민감한 파일 접근 차단
 * 특정 패턴의 파일 또는 경로에 대한 접근을 차단합니다.
 */
export const blockSensitiveFiles = (req: Request, res: Response, next: NextFunction) => {
  // 차단할 파일 패턴 목록
  const blockedPatterns = [
    /\.schema\.ts$/i,
    /schema\.ts$/i,
    /\.env$/i,
    /\/shared\/.+\.ts$/i,
    /\/server\/db\/.+$/i,
    /\/server\/config\.ts$/i,
    /\/server\/security\/.+$/i,
    /package-lock\.json$/i,
    /node_modules\/.+$/i,
    /\.git\/.+$/i,
    /\/server\/middleware\/.+$/i,
    /\/server\/utils\/.+$/i
  ];

  const requestPath = req.path;
  
  // URL에서 파일 확장자나 경로 패턴을 확인
  const isBlocked = blockedPatterns.some(pattern => pattern.test(requestPath));

  if (isBlocked) {
    return res.status(403).json({
      error: '접근이 거부되었습니다. 이 리소스에 대한 권한이 없습니다.'
    });
  }

  next();
};

/**
 * API 전용 라우트 보호 미들웨어
 * API 경로가 아닌 곳에서의 API 접근을 차단합니다.
 */
export const protectApiRoutes = (req: Request, res: Response, next: NextFunction) => {
  // API 경로 패턴 정의
  const apiPathPattern = /^\/api\//;
  
  // API 경로이고 허용된 메서드인지 확인
  if (apiPathPattern.test(req.path)) {
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    
    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({
        error: '허용되지 않은 메서드입니다.'
      });
    }
  }

  next();
};

/**
 * CORS 헤더 및 보안 헤더 추가 미들웨어
 */
export const addSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // 보안 헤더 설정
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://replit.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data:;");
  
  next();
}; 