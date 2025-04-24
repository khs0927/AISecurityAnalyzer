import { Router, Request, Response } from 'express';
import { healthDataManager } from '../health/healthData';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { HealthDataType } from '../health/healthData';
import { monitoring } from '../utils/monitoring';

const router = Router();

/**
 * @swagger
 * /health/data:
 *   post:
 *     summary: 건강 데이터 저장
 *     description: 사용자 건강 데이터를 저장합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - recordedAt
 *               - data
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [vital_signs, lab_result, medication, diagnosis, procedure, imaging, ecg, sleep_data, exercise, dietary, mental_health, custom]
 *               recordedAt:
 *                 type: string
 *                 format: date-time
 *               deviceId:
 *                 type: string
 *               deviceType:
 *                 type: string
 *               sourceName:
 *                 type: string
 *               metadata:
 *                 type: object
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: 건강 데이터 저장 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 */
router.post('/data', requireAuth, validate({
  body: {
    type: { type: 'string', enum: Object.values(HealthDataType) },
    recordedAt: { type: 'string', format: 'date-time' },
    deviceId: { type: 'string', optional: true },
    deviceType: { type: 'string', optional: true },
    sourceName: { type: 'string', optional: true },
    metadata: { type: 'object', optional: true },
    data: { type: 'object' }
  }
}), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const healthData = {
      userId,
      type: req.body.type as HealthDataType,
      recordedAt: new Date(req.body.recordedAt),
      deviceId: req.body.deviceId,
      deviceType: req.body.deviceType,
      sourceName: req.body.sourceName,
      metadata: req.body.metadata,
      data: req.body.data
    };
    
    const id = await healthDataManager.saveHealthData(healthData);
    
    monitoring.log('health', 'info', `사용자 ${userId}가 건강 데이터 저장: ${healthData.type}`);
    
    res.status(201).json({
      success: true,
      data: { id }
    });
  } catch (error) {
    monitoring.log('health', 'error', `건강 데이터 저장 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '건강 데이터 저장 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /health/data/bulk:
 *   post:
 *     summary: 건강 데이터 일괄 저장
 *     description: 여러 건강 데이터를 한번에 저장합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - recordedAt
 *                     - data
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [vital_signs, lab_result, medication, diagnosis, procedure, imaging, ecg, sleep_data, exercise, dietary, mental_health, custom]
 *                     recordedAt:
 *                       type: string
 *                       format: date-time
 *                     deviceId:
 *                       type: string
 *                     deviceType:
 *                       type: string
 *                     sourceName:
 *                       type: string
 *                     metadata:
 *                       type: object
 *                     data:
 *                       type: object
 *     responses:
 *       201:
 *         description: 건강 데이터 일괄 저장 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증되지 않음
 */
router.post('/data/bulk', requireAuth, validate({
  body: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        props: {
          type: { type: 'string', enum: Object.values(HealthDataType) },
          recordedAt: { type: 'string', format: 'date-time' },
          deviceId: { type: 'string', optional: true },
          deviceType: { type: 'string', optional: true },
          sourceName: { type: 'string', optional: true },
          metadata: { type: 'object', optional: true },
          data: { type: 'object' }
        }
      }
    }
  }
}), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const items = req.body.items;
    
    const healthDataItems = items.map((item: any) => ({
      userId,
      type: item.type as HealthDataType,
      recordedAt: new Date(item.recordedAt),
      deviceId: item.deviceId,
      deviceType: item.deviceType,
      sourceName: item.sourceName,
      metadata: item.metadata,
      data: item.data
    }));
    
    const ids = await healthDataManager.bulkSaveHealthData(healthDataItems);
    
    monitoring.log('health', 'info', `사용자 ${userId}가 ${items.length}개의 건강 데이터 일괄 저장`);
    
    res.status(201).json({
      success: true,
      data: { ids }
    });
  } catch (error) {
    monitoring.log('health', 'error', `건강 데이터 일괄 저장 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '건강 데이터 일괄 저장 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /health/data/{id}:
 *   get:
 *     summary: 건강 데이터 조회
 *     description: 특정 ID의 건강 데이터를 조회합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 건강 데이터 ID
 *     responses:
 *       200:
 *         description: 건강 데이터 조회 성공
 *       404:
 *         description: 데이터를 찾을 수 없음
 *       401:
 *         description: 인증되지 않음
 */
router.get('/data/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    
    const healthData = await healthDataManager.getHealthDataById(id);
    
    if (!healthData) {
      return res.status(404).json({
        success: false,
        error: '건강 데이터를 찾을 수 없습니다'
      });
    }
    
    // 사용자 ID 확인
    if (healthData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: '이 건강 데이터에 접근할 권한이 없습니다'
      });
    }
    
    res.status(200).json({
      success: true,
      data: healthData
    });
  } catch (error) {
    monitoring.log('health', 'error', `건강 데이터 조회 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '건강 데이터 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /health/data:
 *   get:
 *     summary: 건강 데이터 목록 조회
 *     description: 사용자의 건강 데이터 목록을 조회합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [vital_signs, lab_result, medication, diagnosis, procedure, imaging, ecg, sleep_data, exercise, dietary, mental_health, custom]
 *         description: 데이터 유형 필터
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 시작 날짜
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 종료 날짜
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 페이지 크기
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 페이지 오프셋
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [recordedAt, createdAt]
 *           default: recordedAt
 *         description: 정렬 기준
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 정렬 방향
 *     responses:
 *       200:
 *         description: 건강 데이터 목록 조회 성공
 *       401:
 *         description: 인증되지 않음
 */
router.get('/data', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // 쿼리 파라미터 파싱
    const type = req.query.type as HealthDataType;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const sortBy = (req.query.sortBy as 'recordedAt' | 'createdAt') || 'recordedAt';
    const sortDirection = (req.query.sortDirection as 'asc' | 'desc') || 'desc';
    
    const result = await healthDataManager.queryHealthData({
      userId,
      type,
      startDate,
      endDate,
      limit,
      offset,
      sortBy,
      sortDirection,
      includeMetadata: true
    });
    
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.data.length < result.total
      }
    });
  } catch (error) {
    monitoring.log('health', 'error', `건강 데이터 목록 조회 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '건강 데이터 목록 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /health/data/{id}:
 *   put:
 *     summary: 건강 데이터 업데이트
 *     description: 특정 ID의 건강 데이터를 업데이트합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 건강 데이터 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [vital_signs, lab_result, medication, diagnosis, procedure, imaging, ecg, sleep_data, exercise, dietary, mental_health, custom]
 *               recordedAt:
 *                 type: string
 *                 format: date-time
 *               deviceId:
 *                 type: string
 *               deviceType:
 *                 type: string
 *               sourceName:
 *                 type: string
 *               metadata:
 *                 type: object
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: 건강 데이터 업데이트 성공
 *       404:
 *         description: 데이터를 찾을 수 없음
 *       401:
 *         description: 인증되지 않음
 */
router.put('/data/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    
    // 데이터 존재 확인 및 소유자 확인
    const existingData = await healthDataManager.getHealthDataById(id);
    
    if (!existingData) {
      return res.status(404).json({
        success: false,
        error: '건강 데이터를 찾을 수 없습니다'
      });
    }
    
    if (existingData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: '이 건강 데이터를 수정할 권한이 없습니다'
      });
    }
    
    // 업데이트 필드 준비
    const updates: any = {};
    
    if (req.body.type) updates.type = req.body.type;
    if (req.body.recordedAt) updates.recordedAt = new Date(req.body.recordedAt);
    if (req.body.deviceId !== undefined) updates.deviceId = req.body.deviceId;
    if (req.body.deviceType !== undefined) updates.deviceType = req.body.deviceType;
    if (req.body.sourceName !== undefined) updates.sourceName = req.body.sourceName;
    if (req.body.metadata !== undefined) updates.metadata = req.body.metadata;
    if (req.body.data !== undefined) updates.data = req.body.data;
    
    // 업데이트 실행
    const success = await healthDataManager.updateHealthData(id, updates);
    
    if (success) {
      monitoring.log('health', 'info', `사용자 ${userId}가 건강 데이터 ID ${id} 업데이트`);
      res.status(200).json({
        success: true,
        data: { id }
      });
    } else {
      res.status(500).json({
        success: false,
        error: '건강 데이터 업데이트에 실패했습니다'
      });
    }
  } catch (error) {
    monitoring.log('health', 'error', `건강 데이터 업데이트 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '건강 데이터 업데이트 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /health/data/{id}:
 *   delete:
 *     summary: 건강 데이터 삭제
 *     description: 특정 ID의 건강 데이터를 삭제합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 건강 데이터 ID
 *     responses:
 *       200:
 *         description: 건강 데이터 삭제 성공
 *       404:
 *         description: 데이터를 찾을 수 없음
 *       401:
 *         description: 인증되지 않음
 */
router.delete('/data/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    
    // 데이터 존재 확인 및 소유자 확인
    const existingData = await healthDataManager.getHealthDataById(id);
    
    if (!existingData) {
      return res.status(404).json({
        success: false,
        error: '건강 데이터를 찾을 수 없습니다'
      });
    }
    
    if (existingData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: '이 건강 데이터를 삭제할 권한이 없습니다'
      });
    }
    
    // 삭제 실행
    const success = await healthDataManager.deleteHealthData(id);
    
    if (success) {
      monitoring.log('health', 'info', `사용자 ${userId}가 건강 데이터 ID ${id} 삭제`);
      res.status(200).json({
        success: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: '건강 데이터 삭제에 실패했습니다'
      });
    }
  } catch (error) {
    monitoring.log('health', 'error', `건강 데이터 삭제 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '건강 데이터 삭제 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /health/statistics:
 *   get:
 *     summary: 건강 데이터 통계 조회
 *     description: 사용자 건강 데이터의 통계 정보를 조회합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 건강 데이터 통계 조회 성공
 *       401:
 *         description: 인증되지 않음
 */
router.get('/statistics', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const statistics = await healthDataManager.getUserHealthStatistics(userId);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    monitoring.log('health', 'error', `건강 데이터 통계 조회 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '건강 데이터 통계 조회 중 오류가 발생했습니다'
    });
  }
});

export default router; 