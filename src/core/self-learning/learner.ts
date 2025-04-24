/**
 * 의료 멀티모달 AI 시스템 - 자가 학습 모듈
 * AI 모델의 응답 및 사용자 피드백을 기반으로 학습하여 성능을 개선합니다.
 */

import { MultimodalInput } from '../model-fusion/router';
import MedicalKnowledgeGraph from '../knowledge-base/graph';

// 학습 사례 인터페이스
export interface LearningExample {
  input: MultimodalInput;
  output: string;
  feedback?: {
    rating: number; // 1-5 척도
    comments?: string;
    corrections?: string;
  };
  timestamp: number;
}

/**
 * 자가 학습 모듈 클래스
 * AI 모델의 응답과 사용자 피드백을 수집하고 학습에 활용합니다.
 */
export class SelfLearningModule {
  private static instance: SelfLearningModule;
  private examples: LearningExample[] = [];
  private knowledgeGraph = MedicalKnowledgeGraph;
  private learningInterval: NodeJS.Timeout | null = null;

  private constructor() {
    console.log('자가 학습 모듈 초기화...');
    // 주기적으로 학습 예제 분석 및 지식 그래프 업데이트
    this.learningInterval = setInterval(() => this.analyzeLearningExamples(), 3600000); // 1시간마다
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): SelfLearningModule {
    if (!SelfLearningModule.instance) {
      SelfLearningModule.instance = new SelfLearningModule();
    }
    return SelfLearningModule.instance;
  }

  /**
   * 학습 사례 기록
   * @param example 학습 사례
   */
  public recordInteraction(example: Omit<LearningExample, 'timestamp'>): void {
    const learningExample: LearningExample = {
      ...example,
      timestamp: Date.now()
    };
    
    this.examples.push(learningExample);
    console.log(`학습 사례 기록: ${learningExample.input.text.substring(0, 50)}...`);
    
    // 만약 저장된 예제가 1000개 이상이면 자동 분석 실행
    if (this.examples.length >= 1000) {
      this.analyzeLearningExamples();
    }
  }

  /**
   * 사용자 피드백 기록
   * @param index 학습 사례 인덱스
   * @param feedback 피드백 정보
   */
  public recordFeedback(index: number, feedback: LearningExample['feedback']): boolean {
    if (index >= 0 && index < this.examples.length) {
      this.examples[index].feedback = feedback;
      console.log(`피드백 기록: 평점 ${feedback?.rating}/5`);
      return true;
    }
    return false;
  }

  /**
   * 학습 사례 분석 및 지식 그래프 업데이트
   */
  private async analyzeLearningExamples(): Promise<void> {
    const exampleCount = this.examples.length;
    if (exampleCount === 0) return;
    
    console.log(`학습 사례 분석 시작: ${exampleCount}개`);
    
    // 좋은 평가를 받은 예제 (평점 4-5점)
    const goodExamples = this.examples.filter(ex => 
      ex.feedback && ex.feedback.rating >= 4
    );
    
    // 나쁜 평가를 받은 예제 (평점 1-2점)
    const badExamples = this.examples.filter(ex => 
      ex.feedback && ex.feedback.rating <= 2
    );
    
    console.log(`좋은 예제: ${goodExamples.length}개, 나쁜 예제: ${badExamples.length}개`);
    
    // 좋은 예제에서 의학 정보 추출
    for (const example of goodExamples) {
      await this.extractMedicalKnowledge(example);
    }
    
    // 분석이 완료된 예제 제거 (메모리 관리)
    this.examples = this.examples.slice(-1000); // 최근 1000개만 유지
    
    console.log('학습 사례 분석 완료');
  }

  /**
   * 의학 지식 추출 및 지식 그래프 업데이트
   * @param example 학습 사례
   */
  private async extractMedicalKnowledge(example: LearningExample): Promise<void> {
    try {
      // 실제 구현에서는 NLP 기술을 사용해 개체 추출
      // 간단한 구현을 위해 키워드 기반 추출
      const medicalTerms = [
        '심장', '심근경색', '부정맥', '혈압', '맥박', '심박수',
        '협심증', '심부전', '심장마비', '판막', '심전도'
      ];
      
      // 입력 텍스트와 출력 텍스트에서 의학 용어 찾기
      const inputText = example.input.text.toLowerCase();
      const outputText = example.output.toLowerCase();
      
      const foundTerms = medicalTerms.filter(term => 
        inputText.includes(term) || outputText.includes(term)
      );
      
      if (foundTerms.length > 0) {
        // 가장 관련 있는 용어를 주제로 선택
        const mainTerm = foundTerms[0];
        
        // PubMed에서 관련 정보 검색 (실제로는 API 직접 호출)
        await this.knowledgeGraph.expandFromPubMed(mainTerm);
        
        console.log(`${mainTerm}에 대한 의학 지식 업데이트 완료`);
      }
    } catch (error) {
      console.error('의학 지식 추출 중 오류:', error);
    }
  }

  /**
   * 웜업 학습 사례 수집 (초기 학습용)
   */
  public async collectWarmupExamples(): Promise<void> {
    // 심장 관련 예제 질문
    const warmupQuestions = [
      '심장 박동이 불규칙하게 느껴질 때 어떻게 해야 하나요?',
      '심근경색의 초기 증상은 무엇인가요?',
      '고혈압을 낮추는 방법은 무엇인가요?',
      '심장 건강을 위한 최고의 운동은 무엇인가요?',
      '부정맥이 있을 때 식이 요법은 어떻게 해야 하나요?'
    ];
    
    console.log('웜업 학습 예제 수집 중...');
    
    // 실제 구현에서는 API를 통해 모델 응답 수집
    // 여기서는 간단한 응답으로 대체
    for (const question of warmupQuestions) {
      this.recordInteraction({
        input: { text: question },
        output: `이것은 "${question}"에 대한 웜업 응답입니다.`
      });
    }
    
    console.log(`${warmupQuestions.length}개 웜업 예제 수집 완료`);
  }

  /**
   * 모듈 상태 및 통계 조회
   */
  public getStatistics(): Record<string, any> {
    // 평점 분포 계산
    const ratingDistribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    
    this.examples.forEach(ex => {
      if (ex.feedback?.rating) {
        ratingDistribution[ex.feedback.rating as 1|2|3|4|5]++;
      }
    });
    
    return {
      totalExamples: this.examples.length,
      withFeedback: this.examples.filter(ex => ex.feedback).length,
      avgRating: this.calculateAverageRating(),
      ratingDistribution,
      knowledgeGraph: this.knowledgeGraph.getStatistics()
    };
  }

  /**
   * 평균 평점 계산
   */
  private calculateAverageRating(): number {
    const examplesWithRating = this.examples.filter(ex => ex.feedback?.rating);
    if (examplesWithRating.length === 0) return 0;
    
    const sum = examplesWithRating.reduce((acc, ex) => acc + (ex.feedback?.rating || 0), 0);
    return sum / examplesWithRating.length;
  }
}

// 기본 인스턴스 내보내기
export default SelfLearningModule.getInstance(); 