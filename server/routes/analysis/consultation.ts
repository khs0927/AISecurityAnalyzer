import { Router } from 'express';
import { logger } from '../../config';
import IntegratedAiSystem from '../../ai/integratedAiSystem';
import { socketManager } from '../../socket/socketManager';

const router = Router();

// 메모리 저장소 (향후 DB 교체 가능)
interface ConsultationSession {
  userId: string;
  messages: Array<{
    sender: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>;
  category?: string;
  lastActive: Date;
}

const consultationSessions: Record<string, ConsultationSession> = {};

/**
 * AI 상담 API 엔드포인트
 * 사용자 메시지를 받아 AI 응답을 생성합니다.
 */
router.post('/', async (req, res) => {
  try {
    const { userId, message, context, category } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId와 message가 필요합니다.'
      });
    }

    // 세션 관리
    if (!consultationSessions[userId]) {
      consultationSessions[userId] = {
        userId,
        messages: [],
        category: category || 'general',
        lastActive: new Date()
      };
    }

    // 세션 업데이트
    const session = consultationSessions[userId];
    session.lastActive = new Date();
    session.messages.push({
      sender: 'user',
      content: message,
      timestamp: new Date()
    });

    // AI 시스템 응답 생성
    let aiResponse = '';
    try {
      // AI 시스템이 초기화되었는지 확인
      if (global.aiSystem && typeof global.aiSystem.generateConsultationResponse === 'function') {
        const systemContext = context || session.messages.slice(-5).map(msg => 
          `${msg.sender === 'user' ? '사용자' : 'AI'}: ${msg.content}`
        ).join('\n');
        
        // AI 모델 사용
        aiResponse = await global.aiSystem.generateConsultationResponse(message, {
          userId,
          context: systemContext,
          category: category || session.category || 'general'
        });
      } else {
        // AI 시스템이 초기화되지 않은 경우 대체 응답
        aiResponse = "AI 시스템이 현재 초기화 중입니다. 잠시 후 다시 시도해주세요.";
        logger.warn('AI 시스템이 초기화되지 않은 상태에서 consultation API 호출됨');
      }
    } catch (aiError) {
      logger.error('AI 응답 생성 중 오류:', aiError);
      aiResponse = "죄송합니다. 현재 AI 응답을 생성하는 데 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }

    // 세션 업데이트
    session.messages.push({
      sender: 'ai',
      content: aiResponse,
      timestamp: new Date()
    });
    
    // 필요시 WebSocket으로 알림
    const io = socketManager.getIO();
    if (io) {
      io.to(userId).emit('ai_consultation_update', {
        userId,
        message: aiResponse,
        timestamp: new Date()
      });
    }

    // 응답 반환
    res.json({
      success: true,
      aiResponse,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('AI 상담 API 오류:', error);
    res.status(500).json({
      success: false,
      error: '상담 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 상담 이력 조회 API
 */
router.get('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId가 필요합니다.'
      });
    }
    
    const session = consultationSessions[userId];
    if (!session) {
      return res.json({
        success: true,
        messages: [],
        category: 'general'
      });
    }
    
    res.json({
      success: true,
      messages: session.messages,
      category: session.category
    });
    
  } catch (error) {
    logger.error('상담 이력 조회 API 오류:', error);
    res.status(500).json({
      success: false,
      error: '상담 이력 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 상담 세션 삭제 API
 */
router.delete('/session/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId가 필요합니다.'
      });
    }
    
    if (consultationSessions[userId]) {
      delete consultationSessions[userId];
    }
    
    res.json({
      success: true,
      message: '상담 세션이 삭제되었습니다.'
    });
    
  } catch (error) {
    logger.error('상담 세션 삭제 API 오류:', error);
    res.status(500).json({
      success: false,
      error: '상담 세션 삭제 중 오류가 발생했습니다.'
    });
  }
});

export default router;