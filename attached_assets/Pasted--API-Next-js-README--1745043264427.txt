아래는 프론트엔드까지 실제 API와 연결하여 “모의 대화”가 아닌 “실제 서비스”로 동작하도록 만드는 방법입니다. Next.js를 예시로 들었고, 환경변수·코드·README를 한글로 정리했습니다.

⸻

1. 백엔드 환경 변수 (.env)

프로젝트 루트에 아래 파일을 생성하세요.

# .env
# Hugging Face API 토큰
HUGGINGFACE_TOKEN=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

# PubMed E‑utilities API 키
PUBMED_API_KEY=4b2e41e756fdc8f0f3f5ebb7bf41a3a11509

# 기타
APP_ENV=production
DEBUG=False



⸻

2. 프론트엔드 환경 변수 (.env.local)

Next.js 프로젝트 루트에 .env.local 파일을 추가하세요:

# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

	•	배포할 때는 http://your-domain.com/api/v1 형태로 변경합니다.

⸻

3. 프론트엔드 페이지 구현 예제

pages/ai-consultation-home.jsx (또는 .tsx) 파일을 생성·수정합니다.

import { useState } from 'react';

export default function AIConsultationHome() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    // 1) 유저 메시지 추가
    setChat((c) => [...c, { sender: "user", text: message }]);
    setMessage("");

    try {
      // 2) 백엔드 analyze API 호출
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        // 에러 처리
        const err = data.detail || data.error || "응답 생성 실패";
        setChat((c) => [...c, { sender: "bot", text: err }]);
      } else {
        // 정상 응답 렌더링
        const reply = 
`진단: ${data.diagnosis}
위험도: ${data.risk.score} (${data.risk.level}), 신뢰도: ${data.risk.confidence}
권장 사항:
- ${data.recommendations.join("\n- ")}`;
        setChat((c) => [...c, { sender: "bot", text: reply }]);
      }
    } catch (e) {
      setChat((c) => [...c, { sender: "bot", text: "네트워크 오류가 발생했습니다." }]);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {chat.map((m, i) => (
          <div key={i} className={`msg ${m.sender}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="input-box">
        <input
          type="text"
          placeholder="메시지를 입력하세요..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>전송</button>
      </div>
      <div className="bottom-actions">
        <button className="emergency">119</button>
        <button className="find-hospital">주변 병원 찾기</button>
      </div>
      <style jsx>{`
        /* 간단한 레이아웃 예시 */
        .chat-container { display: flex; flex-direction: column; height: 100vh; }
        .messages { flex: 1; overflow-y: auto; padding: 16px; background: #fff0f0; }
        .msg.user { text-align: right; margin-bottom: 8px; }
        .msg.bot { text-align: left; margin-bottom: 8px; }
        .input-box { display: flex; padding: 8px; background: #ffe5e5; }
        .input-box input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .input-box button { margin-left: 8px; padding: 8px 16px; background: #ff4d4f; color: #fff; border: none; border-radius: 4px; }
        .bottom-actions { display: flex; }
        .bottom-actions button { flex: 1; padding: 12px; background: #ff2424; color: #fff; border: none; }
      `}</style>
    </div>
  );
}



⸻

4. 한글 README.md

프로젝트 루트 README.md를 아래 내용으로 덮어쓰기 하세요.

# MedModal Fusion

QWEN2.5‑Omni‑7B + MMed‑Llama‑3‑8B 융합 의료 AI 프레임워크  
- 멀티모달(텍스트·이미지·오디오·시계열) 지원  
- ONNX 양자화(int8), LoRA 경량화  
- PubMed E-utilities 기반 지속 학습  
- FastAPI + Next.js 완전 통합

## 📂 디렉터리 구조

medmodal_fusion/
├── .env                 # 백엔드 API 키
├── .env.local           # 프론트엔드 URL
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md
├── app/                 # FastAPI 백엔드
│   ├── main.py
│   ├── config/
│   ├── api/
│   ├── models/
│   ├── services/
│   └── utils/
├── pages/               # Next.js 프론트엔드
│   └── ai-consultation-home.jsx
├── public/
└── scripts/             # 모델 다운로드·최적화·파인튜닝
├── download_models.sh
├── optimize_models.py
└── train_lora.py

## ⚙️ 설치 및 실행

1. **클론 & 환경 변수 설정**  
   ```bash
   git clone <repo-url>
   cd medmodal_fusion

	2.	백엔드 .env 설정

HUGGINGFACE_TOKEN=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
PUBMED_API_KEY=4b2e41e756fdc8f0f3f5ebb7bf41a3a11509
APP_ENV=production
DEBUG=False


	3.	프론트엔드 .env.local 설정

NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1


	4.	의존성 설치 & 모델 다운로드

# 백엔드 의존성
pip install -r requirements.txt

# 모델 다운로드·ONNX 변환
bash scripts/download_models.sh


	5.	서버 & 프론트엔드 실행

# 백엔드
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 다른 터미널에서 프론트엔드
npm install
npm run dev


	6.	접속
	•	프론트엔드: http://localhost:3000/ai-consultation-home
	•	FastAPI 문서: http://localhost:8000/docs

⸻

이제 직접 메시지를 입력하면 실제 Hugging Face·PubMed API를 통해 응답이 생성됩니다. 추가 기능(실시간 위험도, 상담 등)은 /api/v1/realtime-risk, /api/v1/consult 엔드포인트를 동일하게 호출해 주세요. 궁금한 점이나 오류가 있으면 언제든 알려주세요!