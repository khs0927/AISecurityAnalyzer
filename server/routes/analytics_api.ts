import { Router } from 'express';
import { storage } from '../storage';
import fetch from 'node-fetch';

const router = Router();

// PubMed 검색 API
router.get('/pubmed/search', async (req, res) => {
  try {
    const query = req.query.query as string;
    const maxResults = parseInt(req.query.max_results as string || '5');
    
    if (!query) {
      return res.status(400).json({ error: '검색어가 필요합니다.' });
    }
    
    // PubMed API 키 (환경 변수에서 가져옴)
    const PUBMED_API_KEY = process.env.PUBMED_API_KEY || '';
    
    // E-utilities를 사용하여 PubMed 검색
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${maxResults}${PUBMED_API_KEY ? `&api_key=${PUBMED_API_KEY}` : ''}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    const ids = searchData.esearchresult?.idlist || [];
    if (!ids.length) {
      return res.json({ results: [] });
    }
    
    // 검색된 ID로 상세 정보 가져오기
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json${PUBMED_API_KEY ? `&api_key=${PUBMED_API_KEY}` : ''}`;
    const summaryResponse = await fetch(summaryUrl);
    const summaryData = await summaryResponse.json();
    
    // 응답 형식 변환
    const results = ids.map(id => {
      const article = summaryData.result[id] || {};
      return {
        id,
        title: article.title || '',
        authors: (article.authors || []).map((a: any) => a.name).join(", "),
        journal: article.fulljournalname || article.source || '',
        pubDate: article.pubdate || '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        abstract: article.abstracttext || ''
      };
    });
    
    res.json({ results });
  } catch (error) {
    console.error('PubMed 검색 중 오류:', error);
    res.status(500).json({ error: 'PubMed 검색 처리 중 오류가 발생했습니다.' });
  }
});

// 의미론적 검색 API (예시 데이터 반환)
router.get('/semantic/search', async (req, res) => {
  try {
    const query = req.query.query as string;
    const corpusId = req.query.corpus_id as string || 'medical_docs';
    const topK = parseInt(req.query.top_k as string || '3');
    
    if (!query) {
      return res.status(400).json({ error: '검색어가 필요합니다.' });
    }
    
    // 가상의 의미론적 검색 결과 (실제 환경에서는 벡터 DB 또는 검색 엔진 연동)
    const mockResults = [
      {
        id: 'doc1',
        title: '고혈압과 심장 질환의 연관성',
        content: '고혈압은 심장 질환의 주요 위험 요소입니다. 지속적으로 혈압이 높으면 심장과 혈관에 더 많은 부담이 가해지게 됩니다.',
        score: 0.92,
        metadata: {
          author: 'Kim MD, Sang Ho',
          year: 2022,
          source: 'Korean Journal of Cardiology'
        }
      },
      {
        id: 'doc2',
        title: '심근경색: 증상 및 치료',
        content: '심근경색의 주요 증상으로는 가슴 통증, 호흡 곤란, 발한, 현기증 등이 있습니다. 즉각적인 치료는 세 가지 주요 치료법인 혈전용해제, 관상동맥 중재시술, 관상동맥 우회술을 포함합니다.',
        score: 0.85,
        metadata: {
          author: 'Park MD, Ji Hoon',
          year: 2023,
          source: 'International Cardiac Research'
        }
      },
      {
        id: 'doc3',
        title: '심장 질환 예방을 위한 생활 습관',
        content: '건강한 식습관, 규칙적인 운동, 스트레스 관리, 금연은 심장 질환 예방에 효과적입니다. 지중해식 식단이 심장 건강에 도움이 된다는 연구 결과가 있습니다.',
        score: 0.78,
        metadata: {
          author: 'Lee MD, Min Jung',
          year: 2021,
          source: 'Preventive Medicine Journal'
        }
      }
    ];
    
    // 쿼리에 따른 검색 결과 필터링 (실제로는 더 정교한 검색 알고리즘 사용)
    const filteredResults = mockResults
      .filter(doc => 
        doc.title.toLowerCase().includes(query.toLowerCase()) || 
        doc.content.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, topK);
    
    res.json({ 
      query,
      corpus_id: corpusId,
      results: filteredResults 
    });
  } catch (error) {
    console.error('의미론적 검색 중 오류:', error);
    res.status(500).json({ error: '의미론적 검색 처리 중 오류가 발생했습니다.' });
  }
});

// 사용자 건강 데이터 조회 API
router.get('/user/data', async (req, res) => {
  try {
    const userId = req.query.user_id as string;
    
    if (!userId) {
      return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
    }
    
    // 실제 환경에서는 storage에서 사용자 데이터 조회
    // const userData = await storage.getUser(parseInt(userId));
    // const healthData = await storage.getLatestHealthData(parseInt(userId));
    
    // 예시 데이터
    const mockUserData = {
      user_id: userId,
      personal_info: {
        age: 45,
        gender: 'male',
        height: 175,
        weight: 78
      },
      vitals: {
        heart_rate: 72,
        blood_pressure: {
          systolic: 125,
          diastolic: 82
        },
        oxygen_level: 98,
        temperature: 36.5
      },
      medical_history: {
        conditions: ['Hypertension', 'Type 2 Diabetes'],
        allergies: ['Penicillin'],
        surgeries: ['Appendectomy (2010)'],
        family_history: ['Father: Heart Disease', 'Mother: Hypertension']
      },
      medications: [
        {
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'Once daily'
        },
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily'
        }
      ],
      lifestyle: {
        smoking: 'Former smoker (quit 5 years ago)',
        alcohol: 'Occasional',
        exercise: 'Moderate (3 times per week)',
        diet: 'Balanced, low sodium'
      },
      recent_measurements: [
        {
          date: '2025-04-20',
          heart_rate: 75,
          blood_pressure: {
            systolic: 128,
            diastolic: 84
          },
          oxygen_level: 97
        },
        {
          date: '2025-04-23',
          heart_rate: 72,
          blood_pressure: {
            systolic: 125,
            diastolic: 82
          },
          oxygen_level: 98
        }
      ],
      risk_assessment: {
        cardiac_risk_score: 25,
        stroke_risk_score: 18,
        diabetes_complication_risk: 'Moderate'
      }
    };
    
    res.json(mockUserData);
  } catch (error) {
    console.error('사용자 데이터 조회 중 오류:', error);
    res.status(500).json({ error: '사용자 데이터 조회 중 오류가 발생했습니다.' });
  }
});

export default router; 