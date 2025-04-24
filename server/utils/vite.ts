import { Express } from 'express';
import { Server } from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// ESM에서 __dirname 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로그 출력 유틸리티
export function log(message: string, type: string = 'info'): void {
  const colorMap: Record<string, (text: string) => string> = {
    info: chalk.blue,
    error: chalk.red,
    warn: chalk.yellow,
    success: chalk.green,
    vite: chalk.magenta,
    server: chalk.cyan
  };

  const colorFn = colorMap[type] || chalk.white;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${chalk.gray(timestamp)} ${colorFn(`[${type.toUpperCase()}]`)} ${message}`);
}

// Vite 개발 서버 설정
export async function setupVite(app: Express, server: Server): Promise<void> {
  try {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: {
          server
        }
      },
      appType: 'custom'
    });

    // Vite 미들웨어 사용
    app.use(vite.middlewares);
    
    // SPA 라우팅을 위한 처리
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      
      // API 요청은 무시
      if (url.startsWith('/api')) {
        return next();
      }
      
      try {
        // 클라이언트 진입점 파일 로드
        let template = fs.readFileSync(
          path.resolve(__dirname, '../../client/index.html'),
          'utf-8'
        );

        // Vite로 HTML 변환
        template = await vite.transformIndexHtml(url, template);
        
        // 클라이언트 엔트리 로드 및 SSR 처리 (필요한 경우)
        // const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
        // const appHtml = await render(url);
        // const html = template.replace('<!--app-html-->', appHtml);
        
        // SSR을 사용하지 않는 경우 템플릿 직접 전송
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        // Vite 에러 처리
        vite.ssrFixStacktrace(e as Error);
        console.error(e);
        return next(e);
      }
    });

    return vite;
  } catch (e) {
    console.error('Vite 개발 서버 설정 오류:', e);
    throw e;
  }
}

// 프로덕션 환경에서 정적 파일 서빙
export function serveStatic(app: Express): void {
  const distPath = path.resolve(__dirname, '../../dist/public');
  
  // 정적 파일 서비스
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, {
      index: false, // 인덱스 파일 자동 서빙 중지 (SPA 라우팅 처리를 위해)
      maxAge: '1d' // 캐시 설정
    }));
    
    // SPA 라우팅을 위한 폴백
    app.get('*', (req, res, next) => {
      // API 요청은 무시
      if (req.path.startsWith('/api')) {
        return next();
      }
      
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    log('정적 파일 서빙 설정 완료', 'server');
  } else {
    log(`경고: 빌드 디렉토리를 찾을 수 없습니다 - ${distPath}`, 'warn');
  }
} 