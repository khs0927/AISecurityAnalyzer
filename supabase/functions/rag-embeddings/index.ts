import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface DocumentEmbedRequest {
  title: string;
  content: string;
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
    // Supabase 클라이언트 초기화
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      return new Response(
        JSON.stringify({ error: '환경 변수가 설정되지 않았습니다.' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { title, content } = await req.json() as DocumentEmbedRequest;

    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: '제목과 내용이 필요합니다.' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // OpenAI API로 임베딩 생성
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content,
        model: 'text-embedding-3-small'
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.json();
      throw new Error(`OpenAI API 오류: ${JSON.stringify(error)}`);
    }

    const { data } = await embeddingResponse.json();
    const embedding = data[0].embedding;

    // Supabase에 문서와 임베딩 저장
    const { data: insertData, error } = await supabase
      .from('medical_docs')
      .insert([
        {
          title,
          content,
          embedding
        }
      ])
      .select();

    if (error) {
      throw new Error(`Supabase 삽입 오류: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '문서가 성공적으로 임베딩되었습니다',
        document_id: insertData[0].id
      }),
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