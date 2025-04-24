import * as express from 'express';
import * as multer from 'multer';
import * as path from 'path';
import tempFileManager from '../utils/tempFileManager';
import { monitoringInstance } from '../monitoringInstance';

const router = express.Router();

// 메모리 저장소를 사용하여 파일을 버퍼로 처리
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * 단일 파일 업로드
 * POST /api/tempFiles/upload
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '업로드할 파일이 없습니다.',
      });
    }

    const fileInfo = await tempFileManager.saveFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.body.metadata ? JSON.parse(req.body.metadata) : undefined
    );

    monitoringInstance.log('info', '파일 업로드 성공', {
      id: fileInfo.id,
      originalName: fileInfo.originalName,
      size: fileInfo.size,
    }, 'temp-files');

    res.status(200).json({
      success: true,
      fileId: fileInfo.id,
      url: tempFileManager.getFileUrl(fileInfo.id),
      originalName: fileInfo.originalName,
      size: fileInfo.size,
      mimeType: fileInfo.mimeType,
    });
  } catch (error) {
    monitoringInstance.log('error', '파일 업로드 실패', { error }, 'temp-files');
    res.status(500).json({
      success: false,
      message: '파일 업로드 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 다중 파일 업로드
 * POST /api/tempFiles/uploadMultiple
 */
router.post('/uploadMultiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '업로드할 파일이 없습니다.',
      });
    }

    const files = req.files as Express.Multer.File[];
    const results = [];

    for (const file of files) {
      const fileInfo = await tempFileManager.saveFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        req.body.metadata ? JSON.parse(req.body.metadata) : undefined
      );

      results.push({
        fileId: fileInfo.id,
        url: tempFileManager.getFileUrl(fileInfo.id),
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
      });
    }

    monitoringInstance.log('info', '다중 파일 업로드 성공', {
      count: results.length,
    }, 'temp-files');

    res.status(200).json({
      success: true,
      files: results,
    });
  } catch (error) {
    monitoringInstance.log('error', '다중 파일 업로드 실패', { error }, 'temp-files');
    res.status(500).json({
      success: false,
      message: '파일 업로드 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 파일 다운로드
 * GET /api/tempFiles/:fileId
 */
router.get('/:fileId', async (req, res) => {
  const { fileId } = req.params;

  try {
    const fileInfo = tempFileManager.getFile(fileId);
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: '요청한 파일을 찾을 수 없습니다.',
      });
    }

    const fileBuffer = await tempFileManager.readFile(fileId);

    // 브라우저에서 표시할지 여부 결정
    const disposition = req.query.download === 'true' 
      ? 'attachment' 
      : 'inline';

    // 응답 헤더 설정
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader(
      'Content-Disposition', 
      `${disposition}; filename="${encodeURIComponent(fileInfo.originalName)}"`
    );
    res.setHeader('Content-Length', fileInfo.size);

    // 파일 데이터 전송
    res.send(fileBuffer);

    monitoringInstance.log('info', '파일 다운로드 성공', {
      id: fileId,
      originalName: fileInfo.originalName,
    }, 'temp-files');
  } catch (error) {
    monitoringInstance.log('error', '파일 다운로드 실패', { fileId, error }, 'temp-files');
    res.status(500).json({
      success: false,
      message: '파일 다운로드 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 파일 정보 조회
 * GET /api/tempFiles/:fileId/info
 */
router.get('/:fileId/info', (req, res) => {
  const { fileId } = req.params;

  try {
    const fileInfo = tempFileManager.getFile(fileId);
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: '요청한 파일을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      fileInfo: {
        id: fileInfo.id,
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        createdAt: fileInfo.createdAt,
        url: tempFileManager.getFileUrl(fileInfo.id),
        metadata: fileInfo.metadata,
      },
    });
  } catch (error) {
    monitoringInstance.log('error', '파일 정보 조회 실패', { fileId, error }, 'temp-files');
    res.status(500).json({
      success: false,
      message: '파일 정보 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 파일 삭제
 * DELETE /api/tempFiles/:fileId
 */
router.delete('/:fileId', async (req, res) => {
  const { fileId } = req.params;

  try {
    const success = await tempFileManager.deleteFile(fileId);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '요청한 파일을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '파일이 성공적으로 삭제되었습니다.',
    });

    monitoringInstance.log('info', '파일 삭제 성공', { fileId }, 'temp-files');
  } catch (error) {
    monitoringInstance.log('error', '파일 삭제 실패', { fileId, error }, 'temp-files');
    res.status(500).json({
      success: false,
      message: '파일 삭제 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 파일 메타데이터 업데이트
 * PATCH /api/tempFiles/:fileId/metadata
 */
router.patch('/:fileId/metadata', express.json(), async (req, res) => {
  const { fileId } = req.params;
  const { metadata } = req.body;

  if (!metadata || typeof metadata !== 'object') {
    return res.status(400).json({
      success: false,
      message: '유효한 메타데이터가 필요합니다.',
    });
  }

  try {
    const fileInfo = await tempFileManager.updateMetadata(fileId, metadata);
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: '요청한 파일을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '메타데이터가 성공적으로 업데이트되었습니다.',
      metadata: fileInfo.metadata,
    });
  } catch (error) {
    monitoringInstance.log('error', '파일 메타데이터 업데이트 실패', { fileId, error }, 'temp-files');
    res.status(500).json({
      success: false,
      message: '메타데이터 업데이트 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 파일 이동/복사
 * POST /api/tempFiles/:fileId/move
 */
router.post('/:fileId/move', express.json(), async (req, res) => {
  const { fileId } = req.params;
  const { destination } = req.body;

  if (!destination) {
    return res.status(400).json({
      success: false,
      message: '대상 경로가 필요합니다.',
    });
  }

  try {
    // 상대 경로를 절대 경로로 변환
    const absolutePath = path.resolve(destination);
    
    const newPath = await tempFileManager.moveFile(fileId, absolutePath);
    
    res.status(200).json({
      success: true,
      message: '파일이 성공적으로 이동되었습니다.',
      newPath,
    });

    monitoringInstance.log('info', '파일 이동 성공', {
      fileId,
      destination: absolutePath,
    }, 'temp-files');
  } catch (error) {
    monitoringInstance.log('error', '파일 이동 실패', { fileId, destination, error }, 'temp-files');
    res.status(500).json({
      success: false,
      message: '파일 이동 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 임시 파일 관리자 상태 조회
 * GET /api/tempFiles/system/status
 */
router.get('/system/status', (req, res) => {
  try {
    const status = tempFileManager.getStatus();
    
    res.status(200).json({
      success: true,
      status: {
        ...status,
        totalSizeMB: Math.round(status.totalSize / (1024 * 1024) * 100) / 100,
        oldestFileDate: status.oldestFile ? new Date(status.oldestFile).toISOString() : null,
        newestFileDate: status.newestFile ? new Date(status.newestFile).toISOString() : null,
      },
    });
  } catch (error) {
    monitoringInstance.log('error', '상태 조회 실패', { error }, 'temp-files');
    res.status(500).json({
      success: false,
      message: '상태 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 모든 임시 파일 정리
 * DELETE /api/tempFiles/system/cleanup
 */
router.delete('/system/cleanup', async (req, res) => {
  try {
    const count = await tempFileManager.cleanupAllFiles();
    
    res.status(200).json({
      success: true,
      message: '모든 임시 파일이 삭제되었습니다.',
      count,
    });

    monitoringInstance.log('info', '모든 임시 파일 정리 완료', { count }, 'temp-files');
  } catch (error) {
    monitoringInstance.log('error', '임시 파일 정리 실패', { error }, 'temp-files');
    res.status(500).json({
      success: false,
      message: '임시 파일 정리 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router; 