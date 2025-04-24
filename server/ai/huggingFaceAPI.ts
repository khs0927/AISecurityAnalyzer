import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config';
import { monitoring } from '../utils/monitoring';
import { cache } from '../utils/cache';

/**
 * Hugging Face API 관련 인터페이스
 */
export interface TextGenerationOptions {
  model: string;
  inputs: string;
  parameters?: {
    max_new_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repetition_penalty?: number;
    do_sample?: boolean;
    num_return_sequences?: number;
    return_full_text?: boolean;
  };
  useCache?: boolean;
  cacheTTL?: number;
}

export interface ImageGenerationOptions {
  model: string;
  inputs: string;
  parameters?: {
    negative_prompt?: string;
    height?: number;
    width?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
    num_images?: number;
  };
  useCache?: boolean;
  cacheTTL?: number;
}

export interface TextToImageOptions {
  model: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
}

export interface ImageToImageOptions {
  model: string;
  image: Buffer | string; // 이미지 버퍼 또는 URL
  prompt?: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  strength?: number;
  seed?: number;
}

export interface EmbeddingOptions {
  model: string;
  inputs: string | string[];
  useCache?: boolean;
  cacheTTL?: number;
}

export interface QueueInfo {
  status: string;
  estimatedTime?: number;
  position?: number;
  id?: string;
  message?: string;
}

/**
 * Hugging Face API 상호작용 클래스
 */
export class HuggingFaceAPI {
  private static instance: HuggingFaceAPI;
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api-inference.huggingface.co/models/';
  private readonly defaultTimeout: number;
  
  private constructor() {
    this.apiKey = config.ai.huggingFace.apiKey;
    this.defaultTimeout = config.ai.huggingFace.timeout;
    
    if (!this.apiKey) {
      monitoring.log('api', 'warn', 'Hugging Face API 키가 설정되지 않았습니다.');
    }
  }
  
  /**
   * HuggingFaceAPI 인스턴스를 가져옵니다 (싱글톤 패턴)
   */
  public static getInstance(): HuggingFaceAPI {
    if (!HuggingFaceAPI.instance) {
      HuggingFaceAPI.instance = new HuggingFaceAPI();
    }
    return HuggingFaceAPI.instance;
  }
  
  /**
   * API 호출을 위한 헤더를 생성합니다
   */
  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * 텍스트 생성 요청을 전송합니다
   * @param options 텍스트 생성 옵션
   */
  public async generateText(options: TextGenerationOptions): Promise<string[]> {
    const { model, inputs, parameters, useCache = true, cacheTTL = 3600 } = options;
    
    try {
      const cacheKey = useCache ? 
        `text_generation:${model}:${inputs}:${JSON.stringify(parameters || {})}` : null;
      
      // 캐시에서 결과 확인
      if (cacheKey) {
        const cachedResult = await cache.get<string[]>(cacheKey);
        if (cachedResult) {
          monitoring.log('api', 'info', `Hugging Face 텍스트 생성 캐시 히트: ${model}`);
          return cachedResult;
        }
      }
      
      monitoring.log('api', 'info', `Hugging Face 텍스트 생성 요청: ${model}`);
      
      const response = await axios.post(
        `${this.baseUrl}${model}`,
        {
          inputs,
          parameters: parameters || {}
        },
        {
          headers: this.getHeaders(),
          timeout: this.defaultTimeout
        }
      );
      
      let results: string[] = [];
      
      if (Array.isArray(response.data)) {
        results = response.data.map((item: any) => 
          item.generated_text || item.text || JSON.stringify(item)
        );
      } else if (response.data.generated_text) {
        results = [response.data.generated_text];
      } else if (typeof response.data === 'string') {
        results = [response.data];
      } else {
        results = [JSON.stringify(response.data)];
      }
      
      // 결과 캐싱
      if (cacheKey) {
        await cache.set(cacheKey, results, { ttl: cacheTTL });
      }
      
      monitoring.log('api', 'info', `Hugging Face 텍스트 생성 완료: ${model}`);
      return results;
    } catch (error) {
      // 대기열 상태 확인
      if (error.response?.status === 503) {
        const queueInfo = this.parseQueueInfo(error.response.data);
        monitoring.log('api', 'warn', `Hugging Face 모델 대기열: ${model}, 상태: ${queueInfo.status}`);
        
        if (queueInfo.status === 'waiting') {
          // 대기열 정보 반환
          throw new Error(`모델 준비 중: ${queueInfo.message || '대기열에서 대기 중'}`);
        }
      }
      
      monitoring.log('api', 'error', `Hugging Face 텍스트 생성 오류: ${error.message}`);
      throw new Error(`Hugging Face 텍스트 생성 오류: ${error.message}`);
    }
  }
  
  /**
   * 이미지 생성 요청을 전송합니다
   * @param options 이미지 생성 옵션
   */
  public async generateImage(options: ImageGenerationOptions): Promise<string[]> {
    const { model, inputs, parameters, useCache = true, cacheTTL = 3600 } = options;
    
    try {
      const cacheKey = useCache ? 
        `image_generation:${model}:${inputs}:${JSON.stringify(parameters || {})}` : null;
      
      // 캐시에서 결과 확인
      if (cacheKey) {
        const cachedResult = await cache.get<string[]>(cacheKey);
        if (cachedResult) {
          monitoring.log('api', 'info', `Hugging Face 이미지 생성 캐시 히트: ${model}`);
          return cachedResult;
        }
      }
      
      monitoring.log('api', 'info', `Hugging Face 이미지 생성 요청: ${model}`);
      
      const response = await axios.post(
        `${this.baseUrl}${model}`,
        {
          inputs,
          parameters: parameters || {}
        },
        {
          headers: this.getHeaders(),
          timeout: this.defaultTimeout,
          responseType: 'arraybuffer'
        }
      );
      
      let imageBase64: string;
      
      if (Buffer.isBuffer(response.data)) {
        imageBase64 = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
      } else {
        throw new Error('응답이 이미지 형식이 아닙니다');
      }
      
      const results = [imageBase64];
      
      // 결과 캐싱
      if (cacheKey) {
        await cache.set(cacheKey, results, { ttl: cacheTTL });
      }
      
      monitoring.log('api', 'info', `Hugging Face 이미지 생성 완료: ${model}`);
      return results;
    } catch (error) {
      // 대기열 상태 확인
      if (error.response?.status === 503) {
        const queueInfo = this.parseQueueInfo(error.response.data);
        monitoring.log('api', 'warn', `Hugging Face 모델 대기열: ${model}, 상태: ${queueInfo.status}`);
        
        if (queueInfo.status === 'waiting') {
          // 대기열 정보 반환
          throw new Error(`모델 준비 중: ${queueInfo.message || '대기열에서 대기 중'}`);
        }
      }
      
      monitoring.log('api', 'error', `Hugging Face 이미지 생성 오류: ${error.message}`);
      throw new Error(`Hugging Face 이미지 생성 오류: ${error.message}`);
    }
  }
  
  /**
   * 텍스트를 이미지로 변환하는 요청을 전송합니다
   * @param options 텍스트-이미지 변환 옵션
   */
  public async textToImage(options: TextToImageOptions): Promise<string> {
    const { 
      model, 
      prompt, 
      negativePrompt = '', 
      width = 512, 
      height = 512, 
      steps = 30, 
      guidance = 7.5, 
      seed = -1 
    } = options;
    
    try {
      monitoring.log('api', 'info', `Hugging Face 텍스트-이미지 변환 요청: ${model}`);
      
      const payload = {
        inputs: prompt,
        parameters: {
          negative_prompt: negativePrompt,
          width,
          height,
          num_inference_steps: steps,
          guidance_scale: guidance,
          seed: seed === -1 ? Math.floor(Math.random() * 2147483647) : seed
        }
      };
      
      const response = await axios.post(
        `${this.baseUrl}${model}`,
        payload,
        {
          headers: this.getHeaders(),
          timeout: this.defaultTimeout * 2, // 이미지 생성은 시간이 더 걸릴 수 있음
          responseType: 'arraybuffer'
        }
      );
      
      if (Buffer.isBuffer(response.data)) {
        const imageBase64 = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
        monitoring.log('api', 'info', `Hugging Face 텍스트-이미지 변환 완료: ${model}`);
        return imageBase64;
      } else {
        throw new Error('응답이 이미지 형식이 아닙니다');
      }
    } catch (error) {
      // 대기열 상태 확인
      if (error.response?.status === 503) {
        const queueInfo = this.parseQueueInfo(error.response.data);
        monitoring.log('api', 'warn', `Hugging Face 모델 대기열: ${model}, 상태: ${queueInfo.status}`);
        
        if (queueInfo.status === 'waiting') {
          // 대기열 정보 반환
          throw new Error(`모델 준비 중: ${queueInfo.message || '대기열에서 대기 중'}`);
        }
      }
      
      monitoring.log('api', 'error', `Hugging Face 텍스트-이미지 변환 오류: ${error.message}`);
      throw new Error(`Hugging Face 텍스트-이미지 변환 오류: ${error.message}`);
    }
  }
  
  /**
   * 이미지를 이미지로 변환하는 요청을 전송합니다
   * @param options 이미지-이미지 변환 옵션
   */
  public async imageToImage(options: ImageToImageOptions): Promise<string> {
    const { 
      model, 
      image, 
      prompt = '', 
      negativePrompt = '', 
      width = 512, 
      height = 512, 
      steps = 30, 
      guidance = 7.5, 
      strength = 0.8,
      seed = -1 
    } = options;
    
    try {
      monitoring.log('api', 'info', `Hugging Face 이미지-이미지 변환 요청: ${model}`);
      
      const form = new FormData();
      
      // 이미지 추가
      if (Buffer.isBuffer(image)) {
        form.append('image', image, { filename: 'image.jpg' });
      } else if (typeof image === 'string') {
        // URL인 경우 다운로드
        const imageResponse = await axios.get(image, { responseType: 'arraybuffer' });
        form.append('image', Buffer.from(imageResponse.data), { filename: 'image.jpg' });
      } else {
        throw new Error('이미지는 Buffer 또는 URL 문자열이어야 합니다');
      }
      
      // 파라미터 추가
      form.append('prompt', prompt);
      form.append('negative_prompt', negativePrompt);
      form.append('width', width.toString());
      form.append('height', height.toString());
      form.append('num_inference_steps', steps.toString());
      form.append('guidance_scale', guidance.toString());
      form.append('strength', strength.toString());
      form.append('seed', (seed === -1 ? Math.floor(Math.random() * 2147483647) : seed).toString());
      
      const response = await axios.post(
        `${this.baseUrl}${model}`,
        form,
        {
          headers: {
            ...this.getHeaders(),
            ...form.getHeaders()
          },
          timeout: this.defaultTimeout * 2, // 이미지 변환은 시간이 더 걸릴 수 있음
          responseType: 'arraybuffer'
        }
      );
      
      if (Buffer.isBuffer(response.data)) {
        const imageBase64 = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
        monitoring.log('api', 'info', `Hugging Face 이미지-이미지 변환 완료: ${model}`);
        return imageBase64;
      } else {
        throw new Error('응답이 이미지 형식이 아닙니다');
      }
    } catch (error) {
      // 대기열 상태 확인
      if (error.response?.status === 503) {
        const queueInfo = this.parseQueueInfo(error.response.data);
        monitoring.log('api', 'warn', `Hugging Face 모델 대기열: ${model}, 상태: ${queueInfo.status}`);
        
        if (queueInfo.status === 'waiting') {
          // 대기열 정보 반환
          throw new Error(`모델 준비 중: ${queueInfo.message || '대기열에서 대기 중'}`);
        }
      }
      
      monitoring.log('api', 'error', `Hugging Face 이미지-이미지 변환 오류: ${error.message}`);
      throw new Error(`Hugging Face 이미지-이미지 변환 오류: ${error.message}`);
    }
  }
  
  /**
   * 임베딩(벡터 표현) 요청을 전송합니다
   * @param options 임베딩 옵션
   */
  public async getEmbeddings(options: EmbeddingOptions): Promise<number[][]> {
    const { model, inputs, useCache = true, cacheTTL = 86400 } = options; // 임베딩은 더 오래 캐싱
    
    try {
      const cacheKey = useCache ? 
        `embeddings:${model}:${JSON.stringify(inputs)}` : null;
      
      // 캐시에서 결과 확인
      if (cacheKey) {
        const cachedResult = await cache.get<number[][]>(cacheKey);
        if (cachedResult) {
          monitoring.log('api', 'info', `Hugging Face 임베딩 캐시 히트: ${model}`);
          return cachedResult;
        }
      }
      
      monitoring.log('api', 'info', `Hugging Face 임베딩 요청: ${model}`);
      
      const response = await axios.post(
        `${this.baseUrl}${model}`,
        { inputs },
        {
          headers: this.getHeaders(),
          timeout: this.defaultTimeout
        }
      );
      
      let embeddings: number[][];
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        // 배열 응답 처리
        if (Array.isArray(response.data[0])) {
          // 2D 배열인 경우
          embeddings = response.data;
        } else {
          // 1D 배열인 경우
          embeddings = [response.data];
        }
      } else {
        // 객체 응답 처리
        if (response.data.embeddings) {
          embeddings = response.data.embeddings;
        } else if (response.data.embedding) {
          embeddings = [response.data.embedding];
        } else {
          throw new Error('응답에서 임베딩을 찾을 수 없습니다');
        }
      }
      
      // 결과 캐싱
      if (cacheKey) {
        await cache.set(cacheKey, embeddings, { ttl: cacheTTL });
      }
      
      monitoring.log('api', 'info', `Hugging Face 임베딩 완료: ${model}, 차원: ${embeddings[0].length}`);
      return embeddings;
    } catch (error) {
      // 대기열 상태 확인
      if (error.response?.status === 503) {
        const queueInfo = this.parseQueueInfo(error.response.data);
        monitoring.log('api', 'warn', `Hugging Face 모델 대기열: ${model}, 상태: ${queueInfo.status}`);
        
        if (queueInfo.status === 'waiting') {
          // 대기열 정보 반환
          throw new Error(`모델 준비 중: ${queueInfo.message || '대기열에서 대기 중'}`);
        }
      }
      
      monitoring.log('api', 'error', `Hugging Face 임베딩 오류: ${error.message}`);
      throw new Error(`Hugging Face 임베딩 오류: ${error.message}`);
    }
  }
  
  /**
   * 대기열 정보를 파싱합니다
   * @param responseData 응답 데이터
   */
  private parseQueueInfo(responseData: any): QueueInfo {
    try {
      let data: any;
      
      // responseData가 버퍼인 경우 문자열로 변환
      if (Buffer.isBuffer(responseData)) {
        data = JSON.parse(responseData.toString());
      } else if (typeof responseData === 'string') {
        data = JSON.parse(responseData);
      } else {
        data = responseData;
      }
      
      const queueInfo: QueueInfo = {
        status: 'error',
        message: '알 수 없는 오류'
      };
      
      if (data.error && data.error.includes('is currently loading')) {
        queueInfo.status = 'loading';
        queueInfo.message = data.error;
      } else if (data.estimated_time) {
        queueInfo.status = 'waiting';
        queueInfo.estimatedTime = data.estimated_time;
        queueInfo.message = `예상 대기 시간: ${Math.ceil(data.estimated_time)}초`;
      } else if (data.queue_position) {
        queueInfo.status = 'waiting';
        queueInfo.position = data.queue_position;
        queueInfo.message = `대기열 위치: ${data.queue_position}`;
      } else {
        queueInfo.message = data.error || '알 수 없는 오류';
      }
      
      return queueInfo;
    } catch (error) {
      return {
        status: 'error',
        message: '대기열 정보를 파싱할 수 없습니다'
      };
    }
  }
  
  /**
   * 모델의 가용성을 확인합니다
   * @param model 모델 ID
   */
  public async checkModelAvailability(model: string): Promise<{ available: boolean, message: string }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}${model}`,
        {
          headers: this.getHeaders(),
          timeout: 10000 // 짧은 타임아웃
        }
      );
      
      return { 
        available: true, 
        message: '모델이 사용 가능합니다' 
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { 
          available: false, 
          message: '모델을 찾을 수 없습니다' 
        };
      }
      
      // 503 상태는 모델이 로딩 중이거나 대기열에 있음을 의미
      if (error.response?.status === 503) {
        const queueInfo = this.parseQueueInfo(error.response.data);
        return { 
          available: false, 
          message: queueInfo.message || '모델이 현재 로딩 중입니다' 
        };
      }
      
      return { 
        available: false, 
        message: `모델 상태 확인 오류: ${error.message}` 
      };
    }
  }
}

// 싱글톤 인스턴스 생성
export const huggingFaceAPI = HuggingFaceAPI.getInstance(); 