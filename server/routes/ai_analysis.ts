import { Router } from 'express';
import { haimModel } from '../ai/haim_model';
import { storage } from '../storage';

const router = Router();

// 심근경색 위험도 평가
router.post('/cardiac-risk', async (req, res) => {
  try {
    const { ecgData, heartRates, oxygenLevels } = req.body;
    
    if (!ecgData || !heartRates || !oxygenLevels) {
      return res.status(400).json({ 
        error: '필수 데이터가 누락되었습니다. ECG, 심박수, 산소포화도 데이터가 필요합니다.'
      });
    }
    
    const riskAssessment = await haimModel.evaluateCardiacRisk({
      ecgData,
      heartRates,
      oxygenLevels
    });
    
    res.status(200).json(riskAssessment);
  } catch (error) {
    console.error('심근경색 위험도 평가 중 오류:', error);
    res.status(500).json({ error: '위험도 평가 처리 중 오류가 발생했습니다.' });
  }
});

// AI 헬퍼 메시지 생성
router.post('/helper-message', async (req, res) => {
  try {
    const { 
      ecgData, 
      heartRates, 
      oxygenLevels, 
      riskScore = 0, 
      stDeviation = 0,
      arrhythmia = { detected: false, type: null }
    } = req.body;
    
    const helperMessage = await haimModel.generateAIHelperMessage({
      ecgData,
      heartRates,
      oxygenLevels,
      riskScore,
      stDeviation,
      arrhythmia
    });
    
    res.status(200).json({ message: helperMessage });
  } catch (error) {
    console.error('AI 헬퍼 메시지 생성 중 오류:', error);
    res.status(500).json({ error: 'AI 헬퍼 메시지 생성 중 오류가 발생했습니다.' });
  }
});

// HAIM 모델을 사용한 AI 상담 기능
router.post('/consultation', async (req, res) => {
  try {
    const { userId, message, context = "", category = "general" } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ 
        error: '사용자 ID와 메시지가 필요합니다.' 
      });
    }
    
    // 사용자 건강 데이터 로드 (있는 경우)
    let healthData: any = null;
    let ecgData: number[] = [];
    
    try {
      healthData = await storage.getLatestHealthData(userId);
      const ecgRecordings = await storage.getEcgRecordingsByUserId(userId);
      if (ecgRecordings && ecgRecordings.length > 0 && ecgRecordings[ecgRecordings.length - 1].data) {
        ecgData = ecgRecordings[ecgRecordings.length - 1].data as number[];
      }
    } catch (e) {
      console.log('사용자 데이터 불러오기 실패, 기본값 사용:', e);
    }
    
    // 통합 위험도 계산을 위한 데이터 준비
    const heartRates: number[] = healthData && healthData.heartRate ? [healthData.heartRate] : [];
    const oxygenLevels: number[] = healthData && healthData.oxygenLevel ? [healthData.oxygenLevel] : [];
    
    // HAIM 모델을 사용한 심근경색 위험도 평가 (건강 데이터가 있는 경우)
    let riskAssessment: {
      riskScore: number;
      confidence: number;
      factors: Array<{factor: string; contribution: number; confidence: number; description?: string}>;
      interpretation: string;
    } = {
      riskScore: 0,
      confidence: 0,
      factors: [],
      interpretation: ''
    };
    
    if (ecgData && ecgData.length > 0 && heartRates.length > 0 && oxygenLevels.length > 0) {
      riskAssessment = await haimModel.evaluateCardiacRisk({
        ecgData,
        heartRates,
        oxygenLevels
      });
    }
    
    // 응답 생성 로직
    let aiResponse = '';
    
    // 카테고리별 응답 생성
    switch (category) {
      case 'symptoms':
        aiResponse = `AI 헬퍼 분석에 따르면, ${
          riskAssessment.riskScore > 50 
            ? '심장 관련 증상이 중요한 주의가 필요합니다.' 
            : '현재 심각한 심장 증상은 감지되지 않았습니다.'
        }
        
${riskAssessment.interpretation}
        
${message.includes('통증') ? '가슴 통증을 경험하고 계시다면, 증상의 위치, 강도, 지속 시간을 기록하는 것이 중요합니다. 특히 30분 이상 지속되는 압박감이나 조이는 듯한 통증은 즉시 의료 도움을 받아야 합니다.' : ''}
${message.includes('호흡') ? '호흡 곤란은 심장 질환의 중요한 증상일 수 있습니다. 특히 가벼운 활동 후에도 발생하거나 누워있을 때 악화된다면 의사와 상담하세요.' : ''}
${message.includes('두근') ? '심장이 두근거림(심계항진)은 다양한 원인에 의해 발생할 수 있습니다. 지속적이거나 심한 경우 부정맥의 가능성을 확인해야 합니다.' : ''}`;
        break;
        
      case 'riskFactors':
        aiResponse = `AI 헬퍼 분석에 따르면, 귀하의 현재 심근경색 위험도는 ${riskAssessment.riskScore.toFixed(1)}점(100점 만점)으로 ${
          riskAssessment.riskScore < 20 ? '낮음' : 
          riskAssessment.riskScore < 50 ? '보통' : 
          riskAssessment.riskScore < 75 ? '높음' : '매우 높음'
        } 수준입니다. (신뢰도: ${(riskAssessment.confidence * 100).toFixed(0)}%)
        
${riskAssessment.factors.length > 0 ? '주요 위험 요인:\n' + riskAssessment.factors.map(f => `• ${f.factor}: ${f.description}`).join('\n') : '특별한 위험 요인이 감지되지 않았습니다.'}
        
심근경색의 일반적인 위험 요인으로는 고혈압, 당뇨병, 높은 콜레스테롤, 흡연, 가족력, 비만, 스트레스, 심장 질환 이력 등이 있습니다. 위험을 줄이기 위해 건강한 생활 습관 유지와 정기적인 건강 검진이 중요합니다.`;
        break;
        
      case 'lifestyle':
        aiResponse = `건강한 생활 습관은 심장 건강에 매우 중요합니다.
        
AI 헬퍼 분석에 따르면, 귀하의 심장 건강을 향상시키기 위한 맞춤형 권장사항:
        
• 운동: 일주일에 최소 150분의 중강도 유산소 운동이 권장됩니다. 걷기, 수영, 자전거 타기가 좋은 선택입니다.
        
• 식이요법: 지중해식 식단(과일, 채소, 통곡물, 건강한 지방)이 심장 건강에 도움이 됩니다. 나트륨, 가공식품, 포화지방 섭취를 제한하세요.
        
• 스트레스 관리: 명상, 심호흡, 충분한 수면(7-8시간)을 통해 스트레스를 관리하세요.
        
${
  riskAssessment.riskScore > 50 
    ? '귀하의 현재 위험도가 높은 편이므로, 생활 습관 개선과 함께 의료 전문가와의 정기적인 상담이 필요합니다.' 
    : '귀하의 현재 위험도는 양호한 편이지만, 지속적인 건강 관리가 중요합니다.'
}`;
        break;
        
      case 'medications':
        aiResponse = `심장 건강을 위한 약물 정보를 제공해 드립니다.
        
${
  riskAssessment.riskScore > 70 
    ? '귀하의 위험도가 높게 측정되었습니다. 의사와 상담하여 적절한 약물 치료를 고려하는 것이 중요합니다.' :
    '약물 요법은 개인의 상태에 따라 의사가 결정해야 합니다.'
}
        
심장 건강을 위한 일반적인 약물 종류:
        
• 항혈소판제(아스피린 등): 혈전 형성 방지
• 스타틴: 콜레스테롤 수치 조절
• 베타차단제: 심박수와 혈압 조절
• ACE 억제제/ARB: 혈압 조절 및 심장 보호
• 항응고제: 혈전 예방(특히 심방세동 환자)
        
모든 약물은 의사의 처방에 따라 정확한 용량과 시간에 복용하는 것이 중요합니다. 부작용이 있을 경우 즉시 의사와 상담하세요.`;
        break;
        
      case 'emergency':
        aiResponse = `심장 관련 응급 상황 정보를 제공해 드립니다.
        
다음과 같은 증상이 나타나면 즉시 119에 연락하세요:
        
• 가슴 중앙의 압박감, 쥐어짜는 듯한 통증이 30분 이상 지속
• 팔, 턱, 목, 등으로 퍼지는 통증
• 심한 호흡 곤란
• 갑작스러운 실신이나 의식 저하
• 식은땀, 메스꺼움, 구토가 동반된 가슴 불편감
        
${
  riskAssessment.riskScore > 75 
    ? '⚠️ 주의: 귀하의 현재 위험도는 매우 높습니다. 증상이 있다면 즉시 의료 도움을 구하세요.' 
    : '응급 상황에서는 심호흡을 하고 안정을 취하며 구급대원을 기다리세요.'
}
        
주변에 자동제세동기(AED)가 있는지 확인하고, 심폐소생술(CPR)이 필요한 상황에 대비하세요.`;
        break;
        
      default: // 'general' 또는 기타 카테고리
        // 질문에 따른 맞춤형 응답
        if (message.includes('식이') || message.includes('음식') || message.includes('식단')) {
          aiResponse = `심장 건강을 위한 식단은 지중해식 식단이 좋은 예입니다. 과일, 채소, 통곡물, 콩류, 견과류, 올리브 오일, 생선을 충분히 섭취하고 붉은 고기와 가공식품의 섭취를 제한하세요. 특히 나트륨(소금) 섭취를 줄이는 것이 혈압 관리에 중요합니다.
          
AI 헬퍼 분석에 따르면, 귀하의 현재 심장 건강 상태에서는 ${
            riskAssessment.riskScore > 50 
              ? '특히 염분과 포화지방 섭취를 제한하는 것이 권장됩니다.' 
              : '균형 잡힌 식단을 유지하는 것이 중요합니다.'
          }`;
        } else if (message.includes('운동')) {
          aiResponse = `규칙적인 유산소 운동은 심장 건강에 매우 중요합니다. 미국심장협회에서는 성인의 경우 주당 최소 150분의 중강도 유산소 운동 또는 75분의 고강도 운동을 권장합니다.
          
AI 헬퍼 분석에 따르면, 귀하의 현재 심장 상태에서는 ${
            riskAssessment.riskScore > 70 
              ? '의사와 상담 후 가벼운 강도의 운동부터 시작하는 것이 안전합니다.' 
              : '걷기, 자전거 타기, 수영 등의 유산소 운동이 적합합니다.'
          }`;
        } else if (message.includes('가슴') && (message.includes('통증') || message.includes('아파'))) {
          aiResponse = `가슴 통증은 여러 원인에 의해 발생할 수 있지만, 심장 문제와 관련된 가슴 통증은 일반적으로 압박감, 쥐어짜는 듯한 느낌으로 나타납니다.
          
AI 헬퍼 분석에 따르면, 귀하의 현재 ECG 데이터에서는 ${
            riskAssessment.factors.some(f => f.factor.includes('ST')) 
              ? 'ST 세그먼트 편향이 감지되어 주의가 필요합니다.' 
              : '심각한 이상 소견은 발견되지 않았습니다.'
          }
          
통증이 30분 이상 지속되거나 호흡 곤란, 식은땀, 구역질 등이 동반된다면 즉시 응급 의료 서비스(119)에 연락하세요.`;
        } else {
          // 일반적인 응답
          aiResponse = `AI 헬퍼 분석 결과, 귀하의 심장 건강 상태에 대한 정보입니다:
          
위험도: ${riskAssessment.riskScore.toFixed(1)}/100 (${
            riskAssessment.riskScore < 20 ? '낮음' : 
            riskAssessment.riskScore < 50 ? '보통' : 
            riskAssessment.riskScore < 75 ? '높음' : '매우 높음'
          })
신뢰도: ${(riskAssessment.confidence * 100).toFixed(0)}%
          
${riskAssessment.interpretation}
          
${
  riskAssessment.factors.length > 0 
    ? '주요 위험 요인:\n' + riskAssessment.factors.slice(0, 2).map(f => `• ${f.factor}: ${f.description}`).join('\n')
    : ''
}
          
귀하의 질문("${message}")에 관해 더 구체적인 정보가 필요하시면, 증상, 위험 요소, 생활 습관, 약물 정보 등의 카테고리를 선택하여 질문해 주세요.`;
        }
    }
    
    // 상담 기록 저장
    const messagesJSON = JSON.stringify([
      { sender: 'user', content: message, timestamp: new Date().toISOString() },
      { sender: 'ai', content: aiResponse, timestamp: new Date().toISOString() }
    ]);
    
    try {
      await storage.createAiConsultation({
        userId,
        messages: messagesJSON as any,
        category: category
      });
    } catch (e) {
      console.warn('상담 기록 저장 실패:', e);
    }
    
    res.status(200).json({ aiResponse });
  } catch (error) {
    console.error('AI 상담 처리 중 오류:', error);
    res.status(500).json({ 
      error: 'AI 상담 처리 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

export default router;