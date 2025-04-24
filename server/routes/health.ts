import { Router, Request, Response } from 'express';
import { healthDataManager } from '../health/healthData';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { HealthDataType } from '../health/healthData';
import { monitoring } from '../utils/monitoring';
import express from 'express';
import { pusher, supabase } from '../index';

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

/**
 * @swagger
 * /health/heart-rate:
 *   get:
 *     summary: 심박수 데이터 조회
 *     description: 사용자의 심박수 데이터를 기간별로 조회합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         required: true
 *         description: 조회 기간
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 기준 날짜 (기본값: 오늘)
 *     responses:
 *       200:
 *         description: 심박수 데이터 조회 성공
 *       401:
 *         description: 인증되지 않음
 */
router.get('/heart-rate', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as 'day' | 'week' | 'month' || 'day';
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    
    // userId는 인증 시스템 구현 후 사용
    // const userId = req.user?.id || 'anonymous';
    
    let labels: string[] = [];
    let data: number[] = [];
    let stats = { avg: 0, min: 0, max: 0 };
    
    // 기간별 데이터 생성
    if (period === 'day') {
      labels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
      // 실제 구현에서는 DB에서 데이터를 가져와야 함
      data = [62, 65, 68, 72, 75, 73, 70, 68];
      stats = { avg: 69, min: 62, max: 75 };
    } else if (period === 'week') {
      labels = ['월', '화', '수', '목', '금', '토', '일'];
      // 실제 구현에서는 DB에서 데이터를 가져와야 함
      data = [70, 68, 75, 72, 74, 69, 71];
      stats = { avg: 71, min: 68, max: 75 };
    } else if (period === 'month') {
      labels = ['1주', '2주', '3주', '4주'];
      // 실제 구현에서는 DB에서 데이터를 가져와야 함
      data = [72, 70, 73, 71];
      stats = { avg: 72, min: 70, max: 73 };
    }
    
    res.status(200).json({
      success: true,
      data: {
        labels,
        datasets: [{ data }]
      },
      stats
    });
  } catch (error) {
    monitoring.log('health', 'error', `심박수 데이터 조회 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '심박수 데이터 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /health/oxygen:
 *   get:
 *     summary: 산소포화도 데이터 조회
 *     description: 사용자의 산소포화도 데이터를 기간별로 조회합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         required: true
 *         description: 조회 기간
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 기준 날짜 (기본값: 오늘)
 *     responses:
 *       200:
 *         description: 산소포화도 데이터 조회 성공
 *       401:
 *         description: 인증되지 않음
 */
router.get('/oxygen', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as 'day' | 'week' | 'month' || 'day';
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    
    // userId는 인증 시스템 구현 후 사용
    // const userId = req.user?.id || 'anonymous';
    
    let labels: string[] = [];
    let data: number[] = [];
    let stats = { avg: 0, min: 0, max: 0 };
    
    // 기간별 데이터 생성
    if (period === 'day') {
      labels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
      // 실제 구현에서는 DB에서 데이터를 가져와야 함
      data = [96, 97, 98, 99, 98, 97, 98, 97];
      stats = { avg: 98, min: 96, max: 99 };
    } else if (period === 'week') {
      labels = ['월', '화', '수', '목', '금', '토', '일'];
      // 실제 구현에서는 DB에서 데이터를 가져와야 함
      data = [98, 97, 98, 98, 99, 97, 98];
      stats = { avg: 98, min: 97, max: 99 };
    } else if (period === 'month') {
      labels = ['1주', '2주', '3주', '4주'];
      // 실제 구현에서는 DB에서 데이터를 가져와야 함
      data = [98, 97, 98, 98];
      stats = { avg: 98, min: 97, max: 98 };
    }
    
    res.status(200).json({
      success: true,
      data: {
        labels,
        datasets: [{ data }]
      },
      stats
    });
  } catch (error) {
    monitoring.log('health', 'error', `산소포화도 데이터 조회 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '산소포화도 데이터 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * @swagger
 * /health/ecg:
 *   get:
 *     summary: ECG 데이터 조회
 *     description: 사용자의 ECG 데이터를 기간별로 조회합니다
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         required: true
 *         description: 조회 기간
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 기준 날짜 (기본값: 오늘)
 *     responses:
 *       200:
 *         description: ECG 데이터 조회 성공
 *       401:
 *         description: 인증되지 않음
 */
router.get('/ecg', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as 'day' | 'week' | 'month' || 'day';
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    
    // userId는 인증 시스템 구현 후 사용
    // const userId = req.user?.id || 'anonymous';
    
    let labels: string[] = [];
    let data: number[] = [];
    let stats = { avg: 0, min: 0, max: 0 };
    
    // 기간별 데이터 생성
    if (period === 'day') {
      labels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
      // 실제 구현에서는 DB에서 데이터를 가져와야 함
      data = [0.5, 0.7, 0.9, 1.1, 0.8, 0.6, 0.7, 0.9];
      stats = { avg: 0.8, min: 0.5, max: 1.1 };
    } else if (period === 'week') {
      labels = ['월', '화', '수', '목', '금', '토', '일'];
      // 실제 구현에서는 DB에서 데이터를 가져와야 함
      data = [0.8, 0.9, 1.0, 0.7, 0.8, 0.9, 1.1];
      stats = { avg: 0.9, min: 0.7, max: 1.1 };
    } else if (period === 'month') {
      labels = ['1주', '2주', '3주', '4주'];
      // 실제 구현에서는 DB에서 데이터를 가져와야 함
      data = [0.9, 0.8, 0.9, 0.8];
      stats = { avg: 0.85, min: 0.8, max: 0.9 };
    }
    
    res.status(200).json({
      success: true,
      data: {
        labels,
        datasets: [{ data }]
      },
      stats
    });
  } catch (error) {
    monitoring.log('health', 'error', `ECG 데이터 조회 오류: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'ECG 데이터 조회 중 오류가 발생했습니다'
    });
  }
});

const expressRouter = express.Router();

// 건강 데이터 타입 정의
interface HealthData {
  userId: string;
  timestamp: number;
  heartRate: number;
  oxygenLevel: number;
  ecgData: number[];
}

interface HistoricalData {
  daily: HealthData[];
  weekly: HealthData[];
  monthly: HealthData[];
}

interface RiskData {
  userId: string;
  timestamp: number;
  risk: 'low' | 'medium' | 'high';
  message: string;
}

// 현재 건강 데이터 가져오기
expressRouter.get('/current/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('health_data')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return res.status(404).json({ message: '데이터를 찾을 수 없습니다' });
    }
    
    const healthData = {
      userId: data[0].user_id,
      timestamp: data[0].timestamp,
      heartRate: data[0].heart_rate,
      oxygenLevel: data[0].oxygen_level,
      ecgData: data[0].ecg_data
    };
    
    res.json(healthData);
  } catch (err) {
    console.error('건강 데이터 조회 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// 기간별 건강 데이터 가져오기
expressRouter.get('/historical/:userId', async (req, res) => {
  const { userId } = req.params;
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  try {
    // 일별 데이터
    const { data: dailyData, error: dailyError } = await supabase
      .from('health_data')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', dayAgo)
      .order('timestamp', { ascending: true });
      
    if (dailyError) throw dailyError;
    
    // 주별 데이터
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('health_data')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', weekAgo)
      .order('timestamp', { ascending: true });
      
    if (weeklyError) throw weeklyError;
    
    // 월별 데이터
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('health_data')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', monthAgo)
      .order('timestamp', { ascending: true });
      
    if (monthlyError) throw monthlyError;
    
    // 결과 데이터 변환
    const formatData = (data: any[]): HealthData[] => {
      return data.map(item => ({
        userId: item.user_id,
        timestamp: item.timestamp,
        heartRate: item.heart_rate,
        oxygenLevel: item.oxygen_level,
        ecgData: item.ecg_data || []
      }));
    };
    
    const historicalData: HistoricalData = {
      daily: formatData(dailyData || []),
      weekly: formatData(weeklyData || []),
      monthly: formatData(monthlyData || [])
    };
    
    res.json(historicalData);
  } catch (err) {
    console.error('기간별 건강 데이터 조회 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// 건강 데이터 저장 및 실시간 업데이트
expressRouter.post('/', async (req, res) => {
  const healthData: HealthData = req.body;
  
  try {
    // Supabase에 데이터 저장
    const { error } = await supabase
      .from('health_data')
      .insert([{
        user_id: healthData.userId,
        timestamp: healthData.timestamp,
        heart_rate: healthData.heartRate,
        oxygen_level: healthData.oxygenLevel,
        ecg_data: healthData.ecgData
      }]);
      
    if (error) throw error;
    
    // Pusher를 통해 실시간 데이터 전송
    await pusher.trigger(`user-${healthData.userId}`, 'new-data', healthData);
    
    res.status(201).json({ message: '데이터가 성공적으로 저장되었습니다' });
  } catch (err) {
    console.error('건강 데이터 저장 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// 위험 상태 데이터 가져오기
expressRouter.get('/risk/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('risk_data')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(5);
      
    if (error) throw error;
    
    const riskData: RiskData[] = (data || []).map(item => ({
      userId: item.user_id,
      timestamp: item.timestamp,
      risk: item.risk,
      message: item.message
    }));
    
    res.json(riskData);
  } catch (err) {
    console.error('위험 상태 데이터 조회 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// 위험 상태 알림 발송
expressRouter.post('/risk', async (req, res) => {
  const riskData: RiskData = req.body;
  
  try {
    // Supabase에 위험 데이터 저장
    const { error } = await supabase
      .from('risk_data')
      .insert([{
        user_id: riskData.userId,
        timestamp: riskData.timestamp,
        risk: riskData.risk,
        message: riskData.message
      }]);
      
    if (error) throw error;
    
    // Pusher를 통해 위험 알림 전송
    await pusher.trigger(`user-${riskData.userId}`, 'risk-alert', riskData);
    
    res.status(201).json({ message: '위험 알림이 발송되었습니다' });
  } catch (err) {
    console.error('위험 알림 발송 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

export default expressRouter; 