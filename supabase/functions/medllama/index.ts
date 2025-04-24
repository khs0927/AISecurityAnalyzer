import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface RequestBody {
  question: string;
  context?: string;
}

serve(async (req) => {
  // CORS 헤더 설정
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      status: 204,
    });
  }

  try {
    const { question, context = '' } = await req.json() as RequestBody;

    if (!question) {
      return new Response(
        JSON.stringify({ error: '질문이 필요합니다' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Hugging Face API 토큰
    const HF_TOKEN = Deno.env.get('HF_TOKEN');
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'API 토큰이 설정되지 않았습니다' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // JSL-MedLlama-3 모델에 맞는 프롬프트 구성
    const prompt = [
      { role: 'system', content: '당신은 의사로서 정확하고 유용한 의학 정보를 제공합니다. 의학적 조언은 신중하게 제공하고, 확실하지 않은 경우 그 한계를 분명히 밝힙니다.' },
      { role: 'user', content: context ? `${context}\n\n질문: ${question}` : question }
    ];

    // Hugging Face Inference API 호출
    const response = await fetch(
      'https://api-inference.huggingface.co/models/johnsnowlabs/JSL-MedLlama-3-8B-v2.0',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false
          }
        }),
      }
    );

    const data = await response.json();

    // 응답 구조에 따라 파싱
    let answer = '';
    if (Array.isArray(data) && data.length > 0) {
      if ('generated_text' in data[0]) {
        answer = data[0].generated_text;
      } else if ('message' in data[0]) {
        answer = data[0].message.content;
      }
    } else if (data.error) {
      return new Response(
        JSON.stringify({ error: data.error }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 최종 응답 반환
    return new Response(
      JSON.stringify({ answer }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}); 