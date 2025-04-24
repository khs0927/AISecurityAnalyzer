import fetch from 'node-fetch';
import { Request, Response } from 'express';
import { monitoringInstance } from '../monitoringInstance';

// 채팅 API 요청 핸들러
export async function handleChatRequest(req: Request, res: Response) {
  try {
    const { messages, model = "Qwen/Qwen2.5-Omni-7B", return_full_text = false } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '유효한 메시지 배열이 필요합니다.' });
    }
    
    // 마지막 사용자 메시지 가져오기
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    
    if (!lastUserMessage) {
      return res.status(400).json({ error: '사용자 메시지가 필요합니다.' });
    }
    
    // 컨텍스트 구성 (마지막 5개 이하의 메시지)
    const contextMessages = messages.slice(-5);
    const context = contextMessages
      .map(msg => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`)
      .join('\n');
    
    // 모델에 따라 프롬프트 구성
    const prompt = `당신은 심혈관 건강을 전문으로 하는 의료 AI 어시스턴트입니다.
심장 건강, 위험 요인, 생활 방식 선택 및 일반적인 웰빙에 대한 정보를 제공하는 역할을 합니다.
의학적으로 정확하고 명확하며 공감적인 응답을 제공하세요.

중요 지침:
- 절대 구체적인 질환을 진단하거나 개인화된 의료 조언을 제공하지 마세요
- 항상 사용자에게 구체적인 우려 사항에 대해 의료 전문가와 상담하도록 권장하세요
- 심장 건강에 대한 증거 기반 정보 제공
- 공감적이지만 전문적인 태도 유지
- 응답은 질문에 집중하고 간결해야 함
- 응답은 한국어로 제공

이전 대화 컨텍스트:
${context}

사용자: ${lastUserMessage.content}
assistant:`;
    
    // Hugging Face Inference API 호출
    const huggingfaceToken = process.env.HUGGINGFACE_TOKEN || process.env.HUGGINGFACE_API_KEY || "";
    const modelId = model.includes('/') ? model : `Qwen/${model}`;
    const apiUrl = `https://api-inference.huggingface.co/models/${modelId}`;
    
    monitoringInstance.log('info', `채팅 API 요청: ${modelId}`, {}, 'ai');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${huggingfaceToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.7,
          do_sample: true,
          return_full_text: return_full_text
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API 오류: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    // 응답 처리
    let aiResponse = '';
    
    if (Array.isArray(data) && data.length > 0) {
      aiResponse = data[0].generated_text || '';
    } else if (typeof data === 'object' && data.generated_text) {
      aiResponse = data.generated_text;
    } else {
      aiResponse = JSON.stringify(data);
    }
    
    // "assistant: " 접두사 제거 (Qwen 응답에서 흔함)
    const prefix = "assistant: ";
    if (aiResponse.startsWith(prefix)) {
      aiResponse = aiResponse.substring(prefix.length);
    }
    
    monitoringInstance.log('info', '채팅 API 응답 생성 완료', {}, 'ai');
    res.json({ generated_text: aiResponse });
  } catch (error) {
    monitoringInstance.log('error', '채팅 API 오류', { error }, 'ai');
    console.error("채팅 API 오류:", error);
    res.status(500).json({ 
      error: '채팅 응답 생성 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}