import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Heart, Brain, AlertCircle, Thermometer, 
  BadgeAlert, Skull, Flame, Droplets, Wind, Activity, 
  Bandage, Bone, Sparkles, Zap, Bug, Pill 
} from 'lucide-react';

// 응급 처치 항목 타입 정의
interface EmergencyStep {
  title?: string; // 각 단계별 제목
  instruction: string;
  image: string;
}

interface EmergencyCareItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  steps: EmergencyStep[];
  warnings: string[];
  callFor: string[];
}

// 응급 처치 단계별 이미지와 설명
const emergencyDetails: { [key: string]: EmergencyCareItem } = {
  '1': {
    id: '1',
    title: '심정지',
    description: '갑작스러운 의식 소실과 맥박이 없는 응급 상황',
    icon: <Heart className="h-6 w-6" />,
    color: '#FF9999',
    steps: [
      {
        title: '의식 확인',
        instruction: '환자가 반응이 없는지 확인하세요. 어깨를 가볍게 두드리고 "괜찮으세요?"라고 물어보세요.',
        image: 'https://www.firstaidforfree.com/wp-content/uploads/2017/11/checking-responsiveness-in-first-aid-1.png'
      },
      {
        title: '도움 요청',
        instruction: '즉시 119에 신고하세요. 주변에 도움을 요청하고 자동심장충격기(AED)를 가져오도록 부탁하세요.',
        image: 'https://img.freepik.com/premium-vector/911-call-emergency-from-smartphone-vector-medical-concept_387612-116.jpg'
      },
      {
        title: '환자 위치',
        instruction: '환자를 단단한 바닥에 눕히세요. 필요하다면 환자를 등이 바닥에 닿도록 조심스럽게 뒤집으세요.',
        image: 'https://www.firstaidforlife.org.uk/wp-content/uploads/2022/09/recovery-position-1-1536x1024.jpeg'
      },
      {
        title: '가슴 압박 위치',
        instruction: '가슴 중앙(흉골)에 손을 겹쳐 놓고 분당 100-120회 속도로 5-6cm 깊이로 압박하세요.',
        image: 'https://www.nationalcprfoundation.com/wp-content/uploads/2022/05/The-Recoil-Phase-of-CPR-Image-1024x683.jpg'
      },
      {
        title: 'AED 사용',
        instruction: '가능하다면 자동심장충격기(AED)를 사용하세요. AED의 지시에 따라 패드를 부착하고 단계를 따르세요.',
        image: 'https://www.aeddirect.co.uk/media/catalog/category/aed-1.1.jpg'
      },
      {
        title: '지속적인 CPR',
        instruction: '구조대가 도착할 때까지 계속하세요. 지치면 주변에 도움을 요청하여 교대로 심폐소생술을 실시하세요.',
        image: 'https://www.redcross.org/content/dam/redcross/vsi/Health-Safety-Services-Banner-Home.jpg'
      }
    ],
    warnings: [
      '가슴압박 중간에 멈추는 시간을 최소화하세요.',
      '인공호흡 훈련을 받지 않았다면 가슴압박만 계속하세요.',
      '갈비뼈가 부러질 수 있으나 심폐소생술을 중단하지 마세요. 생명을 구하는 것이 우선입니다.'
    ],
    callFor: [
      '환자가 반응이 없을 때',
      '호흡이 없거나 비정상적일 때',
      '맥박이 느껴지지 않을 때'
    ]
  },
  '2': {
    id: '2',
    title: '뇌졸중',
    description: '뇌혈관 손상으로 인한 뇌 기능 장애',
    icon: <Brain className="h-6 w-6" />,
    color: '#B088F9',
    steps: [
      {
        title: 'FAST 확인',
        instruction: 'F(Face): 얼굴이 한쪽으로 처지는지 확인하세요. A(Arms): 양팔을 들어올릴 때 한쪽이 처지는지 확인하세요.',
        image: 'https://i.pinimg.com/originals/35/3b/ed/353bedc954dd6be3f5d5b5ab1ac4d5a8.png'
      },
      {
        title: '언어 확인',
        instruction: 'S(Speech): 말이 어눌하거나 이상한지 확인하세요. 간단한 문장을 따라 말하게 해보세요.',
        image: 'https://image.freepik.com/free-vector/aphasia-brain-injury-concept-man-suffering-from-speech-loss-problem-unable-speak-tell-words-flat-vector-illustration-isolated-white-background_1150-39950.jpg'
      },
      {
        title: '시간 체크',
        instruction: 'T(Time): 증상이 나타난 시간을 확인하세요. 119에 신고할 때 증상 발생 시간을 알려주세요.',
        image: 'https://img.freepik.com/premium-vector/call-an-ambulance-when-stroke-emergency-medical-ambulance-doctor-hospital-help-urgent-call-112-or-911-emergency-service-in-flat-style_101884-1162.jpg'
      },
      {
        title: '편안한 자세',
        instruction: '환자를 편안한 자세로 눕히고 머리와 어깨를 약간 높여주세요. 옷은 느슨하게 풀어주세요.',
        image: 'https://img.freepik.com/premium-vector/flat-illustration-about-proper-sleeping-position-pillows-to-avoid-pain-neck-back-sleep-on-side_432516-2344.jpg'
      },
      {
        title: '음식 금지',
        instruction: '환자에게 물이나 음식을 주지 마세요. 삼킴 장애가 있을 수 있습니다.',
        image: 'https://static.vecteezy.com/system/resources/previews/009/344/667/non_2x/no-eating-or-drinking-sign-no-food-or-beverage-allowed-free-vector.jpg'
      }
    ],
    warnings: [
      '뇌졸중은 치료 시간이 매우 중요합니다. 증상을 발견하면 즉시 119에 신고하세요.',
      '환자에게 약물을 복용시키지 마세요. 아스피린 등이 뇌출혈에는 해로울 수 있습니다.',
      '자가운전으로 병원에 가는 것보다 119를 통한 신속한 이송이 중요합니다.'
    ],
    callFor: [
      '얼굴이 한쪽으로 처지는 경우',
      '한쪽 팔이나 다리에 힘이 빠지는 경우',
      '말이 어눌해지거나 대화가 어려운 경우',
      '갑작스러운, 심한 두통이 발생한 경우',
      '갑자기 심한 어지러움이나 균형감각 상실이 있는 경우'
    ]
  },
  '3': {
    id: '3',
    title: '심장마비',
    description: '심장으로의 혈류 공급 장애로 인한 응급 상황',
    icon: <AlertCircle className="h-6 w-6" />,
    color: '#FF9999',
    steps: [
      {
        title: '증상 확인',
        instruction: '가슴 중앙이나 왼쪽의 통증, 압박감, 답답함이 있는지 확인하세요. 턱, 목, 등, 팔로 통증이 퍼질 수 있습니다.',
        image: 'https://img.freepik.com/premium-vector/man-with-heart-attack-symptoms-chest-pain-cardiac-arrest-concept-cardiovascular-disease-flat-illustration_421086-4027.jpg'
      },
      {
        title: '119 신고',
        instruction: '즉시 119에 신고하세요. "심장마비 의심"이라고 명확히 알리세요.',
        image: 'https://img.freepik.com/premium-vector/ambulance-emergency-call-hand-holding-smartphone-with-ambulance-app-flat-vector-illustration_427612-548.jpg'
      },
      {
        title: '자세와 안정',
        instruction: '환자를 편안한 자세로 앉히거나 눕히고 움직임을 최소화하세요. 환자를 안심시키고 호흡을 편안하게 유지하도록 도와주세요.',
        image: 'https://img.freepik.com/premium-vector/chest-pain-in-man-heart-attack-heart-disease-healthcare-concept-flat-vector-illustration_421086-3924.jpg'
      },
      {
        title: '약물 복용',
        instruction: '환자가 평소 니트로글리세린 같은 심장약을 복용 중이라면 복용하도록 도와주세요.',
        image: 'https://img.freepik.com/premium-vector/pills-bottle-medicine-prescription-drug-medical-treatment-healthcare-concept-flat-vector-illustration-isolated-on-white-background_427612-2150.jpg'
      },
      {
        title: '의식 체크',
        instruction: '환자의 의식이 있는지 계속 확인하세요. 의식을 잃으면 심폐소생술을 준비하세요.',
        image: 'https://www.firstaidforfree.com/wp-content/uploads/2017/11/checking-responsiveness-in-first-aid-1.png'
      }
    ],
    warnings: [
      '심장마비는 생명을 위협하는 응급 상황입니다. 지체 없이 119에 신고하세요.',
      '환자가 처방받은 약이 아니라면 아무 약도 주지 마세요.',
      '의식을 잃으면 즉시 심폐소생술을 시작하세요.'
    ],
    callFor: [
      '가슴 통증이나 압박감이 있는 경우',
      '호흡곤란이 있는 경우',
      '식은땀, 메스꺼움, 구토 증상이 동반될 때',
      '현기증, 실신, 어지러움이 있는 경우',
      '어깨, 팔, 등, 턱으로 통증이 퍼지는 경우'
    ]
  },
  '5': {
    id: '5',
    title: '심한 알레르기',
    description: '아나필락시스 등 심각한 알레르기 반응',
    icon: <BadgeAlert className="h-6 w-6" />,
    color: '#FFD93D',
    steps: [
      {
        title: '원인 제거',
        instruction: '알레르기 원인이 된 물질(음식, 약물, 벌 등)에서 환자를 멀리 떨어뜨리세요.',
        image: 'https://img.freepik.com/premium-vector/food-allergy-concept-vector-illustration-isolated-on-white-background_143097-279.jpg'
      },
      {
        title: '에피네프린 주사',
        instruction: '환자가 에피네프린 자가주사기(에피펜)를 가지고 있다면 사용하도록 도와주세요. 허벅지 바깥쪽에 주사합니다.',
        image: 'https://img.freepik.com/premium-vector/syringe-epipen-adrenaline-injection-epinephrine-for-anaphylactic-shock-treatment-vector-illustration-flat-design_612346-1369.jpg'
      },
      {
        title: '119 신고',
        instruction: '즉시 119에 신고하세요. "심한 알레르기 반응"이라고 명확히 알리세요.',
        image: 'https://img.freepik.com/premium-vector/call-ambulance-medical-service-phone-emergency-call-accident-healthcare-concept-first-aid-transport-patient-to-hospital-flat-vector-illustration_434716-418.jpg'
      },
      {
        title: '편안한 자세',
        instruction: '환자를 편안한 자세로 눕히세요. 호흡이 힘들다면 상체를 약간 세워서 앉히세요.',
        image: 'https://img.freepik.com/premium-vector/comfortable-recovery-position-in-home-resting-pose-for-good-health-vector-flat-style_83622-2267.jpg'
      },
      {
        title: '상태 관찰',
        instruction: '환자의 호흡과 의식 상태를 지속적으로 관찰하세요. 상태가 악화되면 심폐소생술을 준비하세요.',
        image: 'https://static.vecteezy.com/system/resources/previews/009/384/466/non_2x/woman-experiencing-chest-pain-difficulty-breathing-female-with-shortness-of-breath-free-vector.jpg'
      }
    ],
    warnings: [
      '알레르기 반응은 급격히 악화될 수 있으니 증상이 완화되었더라도 반드시 의료기관을 방문하세요.',
      '에피네프린 주사 후에도 증상이 계속된다면 5-15분 후 한 번 더 주사할 수 있습니다.',
      '환자가 의식을 잃으면 즉시 심폐소생술을 시작하세요.'
    ],
    callFor: [
      '호흡 곤란이나 쌕쌕거림이 있을 때',
      '얼굴, 입술, 혀의 부종이 있을 때',
      '전신 두드러기나 가려움이 심할 때',
      '현기증이나 실신이 있을 때',
      '메스꺼움, 구토, 복통이 동반될 때'
    ]
  },
  '7': {
    id: '7',
    title: '화상',
    description: '화상 응급처치 (Burn Care)',
    icon: <Flame className="h-6 w-6" />,
    color: '#FF9999',
    steps: [
      {
        title: '냉각하기',
        instruction: '즉시 화상 부위를 찬물(10-15°C)에 15-20분간 담그거나 흐르는 물에 식히세요.',
        image: 'https://theburnscentre.com.au/wp-content/uploads/2022/08/burn-first-aid-cold-running-water-15-20-minutes-800x800.png'
      },
      {
        title: '옷 제거',
        instruction: '화상 부위에서 옷을 제거하되, 피부에 붙어있다면 억지로 떼지 마세요.',
        image: 'https://www.dermcare4u.com/wp-content/uploads/2022/04/peeling-skin.jpg'
      },
      {
        title: '장신구 제거',
        instruction: '반지, 시계 등 장신구를 제거하세요. 화상 부위가 부어오를 수 있습니다.',
        image: 'https://img.freepik.com/premium-vector/hand-with-rings-removing-jewelry-because-of-swollen-fingers-hand-edema-concept-vector-flat-illustration-isolated-on-white-background_501069-2116.jpg'
      },
      {
        title: '상처 덮기',
        instruction: '깨끗한 거즈나 면포로 화상 부위를 느슨하게 덮으세요.',
        image: 'https://www.mfasco.com/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/g/a/gauze_on_arm.jpg'
      },
      {
        title: '연고 금지',
        instruction: '감염 방지를 위해 화상 부위에 연고나 기름 등을 바르지 마세요.',
        image: 'https://thumbs.dreamstime.com/b/sign-prohibiting-do-not-apply-cream-ointment-burn-wound-prohibiting-do-not-apply-cream-ointment-burn-wound-264252125.jpg'
      }
    ],
    warnings: [
      '화상 부위에 얼음을 직접 대지 마세요. 조직 손상을 악화시킬 수 있습니다.',
      '화상 물집을 터뜨리지 마세요. 감염 위험이 증가합니다.',
      '화상 부위에 버터, 치약, 기름 등을 바르지 마세요.',
      '화상 부위를 물에 담근 후 약국이나 병원에서 처방받은 연고만 바르세요.'
    ],
    callFor: [
      '얼굴, 손, 발, 생식기 등의 화상',
      '넓은 면적(성인 손바닥 크기 이상)의 화상',
      '2도 이상(물집 형성)의 심한 화상',
      '화학물질이나 전기에 의한 화상'
    ]
  },
  '8': {
    id: '8',
    title: '코피',
    description: '비출혈 응급처치 (Nosebleed Care)',
    icon: <Droplets className="h-6 w-6" />,
    color: '#FF9999',
    steps: [
      {
        title: '머리 자세',
        instruction: '머리를 약간 앞으로 숙이세요. 목 뒤로 피가 넘어가는 것을 방지합니다.',
        image: 'https://img.freepik.com/premium-vector/man-with-bleeding-nose-first-aid-for-nosebleed-vector-illustration_587001-534.jpg'
      },
      {
        title: '코 압박',
        instruction: '엄지와 검지로 콧볼을 10-15분간 꾹 눌러주세요.',
        image: 'https://img.freepik.com/premium-vector/nosebleed-first-aid-man-pinching-his-nose-to-stop-bleeding-vector-illustration_587001-538.jpg'
      },
      {
        title: '냉찜질',
        instruction: '이마와 목에 차가운 수건이나 얼음팩을 대세요. 직접 코에 닿지 않게 해주세요.',
        image: 'https://img.freepik.com/premium-vector/first-aid-for-nosebleed-vector-illustration-woman-with-ice-pack-on-nose-to-stop-bleeding_587001-536.jpg'
      },
      {
        title: '입 호흡',
        instruction: '압박을 유지한 채 호흡은 입으로 하세요.',
        image: 'https://thumbs.dreamstime.com/b/first-aid-nosebleed-girl-mouth-breathing-holding-nose-epistaxis-management-health-care-concept-flat-style-vector-222143144.jpg'
      },
      {
        title: '압박 반복',
        instruction: '15분 후에도 계속 출혈한다면 다시 10-15분간 압박을 반복하세요.',
        image: 'https://img.freepik.com/premium-vector/set-of-people-with-nosebleed-first-aid-for-epistaxis-vector-illustration_587001-539.jpg'
      }
    ],
    warnings: [
      '머리를 뒤로 젖히지 마세요. 피가 목 뒤로 넘어가 구역질이나 기도 문제를 일으킬 수 있습니다.',
      '코를 풀지 마세요. 출혈이 더 심해질 수 있습니다.',
      '코 안에 티슈나 솜을 넣지 마세요. 제거할 때 출혈이 다시 시작될 수 있습니다.',
      '30분 이상 출혈이 계속된다면 의료기관을 방문하세요.'
    ],
    callFor: [
      '30분 이상 지속되는 코피',
      '머리 부상 후 발생한 코피',
      '과도한 출혈로 호흡이 어려운 경우',
      '고혈압 환자의 심한 코피',
      '출혈량이 많고 멈추지 않는 경우'
    ]
  },
  '9': {
    id: '9',
    title: '기도 막힘',
    description: '이물질로 인한 호흡 곤란',
    icon: <Wind className="h-6 w-6" />,
    color: '#A0C4FF',
    steps: [
      {
        title: '증상 확인',
        instruction: '환자가 기침을 할 수 없거나, 말을 할 수 없거나, 청색증(입술이나 피부가 파래짐)이 있는지 확인하세요.',
        image: 'https://img.freepik.com/premium-vector/man-choking-unable-to-breathe-concept-of-airway-obstruction-flat-vector-illustration_533410-2233.jpg'
      },
      {
        title: '하임리히법 1',
        instruction: '환자 뒤에 서서 양손으로 환자의 배꼽과 명치 사이를 감싸세요.',
        image: 'https://img.freepik.com/premium-vector/chocking-person-help-emergency-situation-foreign-body-airway-obstruction-cpr-for-choking-adult-heimlich-maneuver-vector-illustration-flat-style_533410-4417.jpg'
      },
      {
        title: '하임리히법 2',
        instruction: '한 손은 주먹을 쥐고 엄지를 배에 대고, 다른 손으로 주먹을 감싼 후 빠르게 안쪽 위로 밀어 올리세요.',
        image: 'https://img.freepik.com/premium-vector/first-aid-choking-person-heimlich-maneuver-performing-by-woman-vector-illustration-abdominal-thrusts-emergency-medical-help-flat-style_533410-4396.jpg'
      },
      {
        title: '하임리히법 3',
        instruction: '이물질이 나올 때까지 반복하세요. 5-6회씩 빠르게 압박합니다.',
        image: 'https://img.freepik.com/premium-vector/emergency-case-heimlich-maneuver-help-crying-choking-man-flat-first-aid-guide-on-poster-vector-illustration-abdominal-thrusts-push-to-save-human-life-medicine-education-concept_533410-4400.jpg'
      },
      {
        title: '의식 상실 시',
        instruction: '환자가 의식을 잃으면 바닥에 눕히고 119에 신고한 후 심폐소생술을 시작하세요.',
        image: 'https://www.redcross.org/content/dam/redcross/Health-Safety-Services/CPR-Choking-featured.png'
      }
    ],
    warnings: [
      '경미한 기도 막힘(기침 가능, 말 가능)일 때는 자연스러운 기침을 방해하지 마세요.',
      '임산부나 비만인 경우 가슴부위에 하임리히법을 실시하세요.',
      '1세 미만의 영아에게는 등 두드리기와 가슴 압박을 번갈아 실시하세요.'
    ],
    callFor: [
      '이물질이 제거되지 않을 때',
      '환자가 의식을 잃었을 때',
      '환자가 심한 호흡 곤란을 보일 때',
      '입술이나 피부가 파란색으로 변할 때'
    ]
  },
  '10': {
    id: '10',
    title: '심폐소생술',
    description: '심폐소생술 (CPR)',
    icon: <Activity className="h-6 w-6" />,
    color: '#FF9999',
    steps: [
      {
        title: '의식 확인',
        instruction: '환자의 반응을 확인하세요. 어깨를 두드리고 큰 소리로 "괜찮으세요?"라고 물어보세요.',
        image: 'https://www.firstaidforfree.com/wp-content/uploads/2017/11/checking-responsiveness-in-first-aid-1.png'
      },
      {
        title: '도움 요청',
        instruction: '도움을 요청하고 119에 전화하세요. 주변에 자동심장충격기(AED)를 요청하세요.',
        image: 'https://img.freepik.com/premium-vector/male-calling-emergency-on-smart-phone-vector-illustration-flat-design_114341-52.jpg'
      },
      {
        title: '바른 자세',
        instruction: '환자를 바로 눕히세요. 단단한 바닥에 등을 대고 눕히는 것이 중요합니다.',
        image: 'https://st4.depositphotos.com/6159674/25143/i/450/depositphotos_251437510-stock-photo-man-doing-cpr-first-aid.jpg'
      },
      {
        title: '손 위치',
        instruction: '가슴 중앙에 손을 겹쳐놓고, 팔꿈치를 펴세요. 손꿈치가 흉골 중앙에 위치해야 합니다.',
        image: 'https://img.freepik.com/premium-vector/heart-cardiopulmonary-resuscitation-or-cpr-first-aid-chest-compressions-during-cpr-healthcare-concept-vector-illustration-flat-style_587001-498.jpg'
      },
      {
        title: '가슴 압박',
        instruction: '분당 100-120회 속도로 5-6cm 깊이로 가슴을 압박하세요. 리듬감 있게 "하나, 둘, 셋..." 세어가며 압박하세요.',
        image: 'https://cdn-prod.medicalnewstoday.com/content/images/articles/324/324712/cpr-being-performed-on-a-dummy.jpg'
      },
      {
        title: '인공호흡',
        instruction: '30회 압박 후 2회 인공호흡을 실시하세요(훈련받은 경우). 인공호흡 시 코를 막고 입에 완전히 밀착하여 불어넣으세요.',
        image: 'https://www.firstaidforfree.com/wp-content/uploads/2013/05/rescue-breaths.jpg'
      },
      {
        title: '반복 실시',
        instruction: '구급대원이 도착할 때까지 반복하세요. 30회 가슴압박과 2회 인공호흡을 계속 반복합니다.',
        image: 'https://static.vecteezy.com/system/resources/previews/002/001/275/original/man-performing-cpr-on-woman-an-emergency-situation-vector.jpg'
      }
    ],
    warnings: [
      '가슴압박 중단 시간을 최소화하세요. 중단 시간이 10초를 넘지 않도록 하세요.',
      '압박 후 가슴이 완전히 이완되도록 하세요. 압박과 이완의 시간은 동일해야 합니다.',
      '훈련받지 않았다면 인공호흡 없이 가슴압박만 계속하세요.',
      '피로로 효과적인 압박이 어렵다면 다른 사람과 교대하세요.'
    ],
    callFor: [
      '의식이 없고 정상적인 호흡이 없는 경우',
      '맥박이 없는 경우',
      '모든 심정지 상황',
      '호흡이 매우 힘들거나 불규칙한 경우'
    ]
  },
  '11': {
    id: '11',
    title: '출혈',
    description: '심한 출혈의 응급 처치',
    icon: <Bandage className="h-6 w-6" />,
    color: '#FF9999',
    steps: [
      {
        title: '직접 압박',
        instruction: '깨끗한 천이나 거즈로 출혈 부위를 직접 압박하세요. 가능하면 장갑을 착용하세요.',
        image: 'https://img.freepik.com/premium-vector/wound-skin-with-blood-bleeding-injury-bandage-and-gauze-first-aid-for-cut-medical-concept-vector-illustration-flat-style_533410-2237.jpg'
      },
      {
        title: '압박 유지',
        instruction: '출혈이 멈출 때까지 최소 10-15분간 지속적으로 압박하세요. 압박을 중단하면 다시 출혈할 수 있습니다.',
        image: 'https://img.freepik.com/premium-vector/first-aid-for-bleeding-wound-man-bandaging-injury-health-care-concept-flat-vector-illustration_533410-2273.jpg'
      },
      {
        title: '환부 거상',
        instruction: '가능하다면 출혈 부위를 심장보다 높게 올리세요. 팔이나 다리의 출혈인 경우 유용합니다.',
        image: 'https://img.freepik.com/premium-vector/elevated-broken-leg-injury-treatment-limb-amputation-flat-style-elevation-concept-vector-illustration_533410-2225.jpg'
      },
      {
        title: '붕대 감기',
        instruction: '출혈이 멈추면 깨끗한 붕대로 상처를 감싸세요. 너무 조이지 않도록 주의하세요.',
        image: 'https://img.freepik.com/premium-vector/bandaged-leg-or-foot-trauma-first-aid-for-injured-limbs-treating-wounds-fractures-sprains-with-elastic-bandage-medical-healthcare-concept-flat-cartoon-vector-illustration_533410-9006.jpg'
      },
      {
        title: '쇼크 방지',
        instruction: '환자를 편안하게 눕히고 담요로 따뜻하게 해주세요. 발을 약간 높이는 것이 도움이 됩니다.',
        image: 'https://img.freepik.com/premium-vector/sick-man-lying-in-hospital-bed-with-broken-leg-in-cast-waiting-for-recovery_533410-1740.jpg'
      }
    ],
    warnings: [
      '지혈대는 최후의 수단으로만 사용하세요. 사용 시 시간을 기록해두세요.',
      '이물질이 박힌 상처라면 이물질을 제거하지 말고 주변을 압박하세요.',
      '내부 출혈이 의심되면(타박상, 구토 시 피, 검은 변) 즉시 119를 부르세요.'
    ],
    callFor: [
      '압박으로도 멈추지 않는 심한 출혈',
      '복부나 흉부의 관통상',
      '대형 이물질이 박힌 상처',
      '팔다리가 절단된 경우',
      '내부 출혈이 의심되는 경우'
    ]
  },
  '12': {
    id: '12',
    title: '골절',
    description: '뼈의 골절 응급 처치',
    icon: <Bone className="h-6 w-6" />,
    color: '#DDDDDD',
    steps: [
      {
        title: '안전 확보',
        instruction: '부상자와 주변 사람들의 안전을 확인하세요. 필요하다면 위험한 환경에서 벗어나세요.',
        image: 'https://img.freepik.com/premium-vector/paramedics-team-saving-injured-person-emergency-ambulance-doctor-rescue-flat-vector-illustration_533410-4353.jpg'
      },
      {
        title: '고정 준비',
        instruction: '부상 부위를 움직이지 않도록 하세요. 골절이 의심되는 부위를 관찰만 하고 가능한 만지지 마세요.',
        image: 'https://img.freepik.com/premium-vector/trauma-broken-leg-in-cast-injury-flat-vector-illustration_533410-1847.jpg'
      },
      {
        title: '부목 대기',
        instruction: '주변의 단단한 물건(나무판, 잡지, 신문 등)을 이용해 부상 부위 양쪽에 부목을 대고 고정하세요.',
        image: 'https://img.freepik.com/premium-vector/leg-in-a-splint-injured-limb-stabilization-first-aid-healthcare-medicine-concept-flat-vector-illustration_533410-2255.jpg'
      },
      {
        title: '붕대로 고정',
        instruction: '부목을 붕대나 천으로 고정하되, 너무 조이지 않도록 주의하세요. 손가락이나 발가락 끝이 보이도록 하여 혈액순환을 확인하세요.',
        image: 'https://img.freepik.com/premium-vector/trauma-bandage-on-broken-arm-splint-for-injury-limb-treatment-procedure-flat-style-vector-illustration_533410-2253.jpg'
      },
      {
        title: '냉찜질',
        instruction: '부기와 통증을 줄이기 위해 얼음팩이나 차가운 물건을 수건에 싸서 부상 부위에 댑니다(직접 피부에 닿지 않도록).',
        image: 'https://img.freepik.com/premium-vector/ice-pack-on-injured-sprained-leg-ankle-cold-compress-for-joint-pain-relief-healthcare-concept-flat-vector-illustration_533410-2224.jpg'
      }
    ],
    warnings: [
      '외부로 노출된 골절(개방성 골절)은 깨끗한 천으로 덮고 출혈을 막은 후 즉시 119를 부르세요.',
      '부상자를 움직이면 더 심한 손상을 초래할 수 있으니 꼭 필요한 경우가 아니면 움직이지 마세요.',
      '통증이 심한 경우, 부위가 변형되거나, 피부색이 변하면 골절을 의심하고 병원 진료를 받으세요.'
    ],
    callFor: [
      '심한 통증과 부종이 있는 경우',
      '부상 부위가 눈에 띄게 변형된 경우',
      '골절 부위가 피부 밖으로 노출된 경우',
      '부상 후 움직일 수 없거나 움직이기 어려운 경우',
      '목이나 척추 부상이 의심되는 경우'
    ]
  }
};

const EmergencyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [emergency, setEmergency] = useState<EmergencyCareItem | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [progressPercent, setProgressPercent] = useState(100);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id && emergencyDetails[id]) {
      setEmergency(emergencyDetails[id]);
    } else {
      // ID가 없거나 해당 데이터가 없는 경우 목록 페이지로 이동
      setLocation('/emergency-guide');
    }
  }, [id, setLocation]);

  // 단계별 재생 시간 결정 함수 (단계별로 다른 시간 설정)
  const getStepDuration = (step: number, title?: string): number => {
    // 단계별 제목을 기반으로 시간 조정 (ms 단위)
    if (title) {
      const lowerTitle = title.toLowerCase();
      
      // 의식 확인, 손 위치, 머리 자세 등 간단한 단계는 짧게
      if (lowerTitle.includes('의식 확인') || 
          lowerTitle.includes('자세') || 
          lowerTitle.includes('위치') || 
          lowerTitle.includes('확인')) {
        return 3000; // 3초
      }
      
      // 압박, 동작 등 중간 난이도 단계
      if (lowerTitle.includes('압박') || 
          lowerTitle.includes('호흡') || 
          lowerTitle.includes('실시') ||
          lowerTitle.includes('냉찜질')) {
        return 4500; // 4.5초
      }
    }
    
    // 기본값 또는 다른 모든 단계
    return 5000; // 5초
  };

  // 자동 재생 기능
  useEffect(() => {
    if (autoPlay && emergency) {
      const moveToNextStep = () => {
        setCurrentStep(prev => {
          const nextStep = prev + 1;
          if (nextStep >= emergency.steps.length) {
            // 마지막 단계에서 자동 재생 중지
            setAutoPlay(false);
            return 0;
          }
          return nextStep;
        });
      };
      
      // 현재 단계에 맞는 지속 시간 계산
      const duration = getStepDuration(
        currentStep, 
        emergency.steps[currentStep].title
      );
      
      // 프로그레스 바 초기화 및 시작
      setProgressPercent(100);
      
      // 프로그레스 바 애니메이션을 위한 간격 설정 (10ms마다 갱신)
      const totalSteps = duration / 10;
      const decrementPerStep = 100 / totalSteps;
      
      progressIntervalRef.current = setInterval(() => {
        setProgressPercent(prev => {
          const newValue = Math.max(0, prev - decrementPerStep);
          return newValue;
        });
      }, 10);
      
      // 설정한 시간 후 다음 단계로 이동
      autoPlayRef.current = setTimeout(moveToNextStep, duration);
    } else {
      // 자동 재생이 중지되면 프로그레스 바 리셋
      setProgressPercent(100);
      
      // 프로그레스 인터벌 클리어
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
        autoPlayRef.current = null;
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [autoPlay, emergency, currentStep]);

  const handleNextStep = () => {
    if (emergency && currentStep < emergency.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
  };

  if (!emergency) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="flex flex-col pb-6">
      <div className="rounded-3xl overflow-hidden border border-[#FF8FAB] bg-white">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="bg-[#FFF5F5] text-[#FF0000] w-8 h-8 flex items-center justify-center rounded-full mr-2 font-bold text-base">
                {currentStep + 1}
              </div>
              <h3 className="text-[#FF0000] font-bold text-lg">
                {emergency.steps[currentStep].title || '단계'}
              </h3>
            </div>
            <div className="text-sm text-gray-500 bg-[#F8F9FA] px-2 py-1 rounded">
              {currentStep + 1} / {emergency.steps.length}
            </div>
          </div>
          
          <p className="text-sm text-gray-700 py-3">
            {emergency.steps[currentStep].instruction}
          </p>
          
          {/* 이미지 영역 */}
          <div className="bg-[#F8F9FA] rounded-sm h-64 flex flex-col items-center justify-center overflow-hidden relative">
            <img 
              src={emergency.steps[currentStep].image}
              alt="응급처치 단계 이미지"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/400x300?text=이미지+준비중';
              }}
            />
            
            {/* 프로그레스 바 */}
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-200">
              <div 
                className="h-full bg-[#FF0000]" 
                style={{ 
                  width: `${progressPercent}%`,
                  transition: autoPlay ? 'none' : 'width 0.3s ease-out'
                }}
              />
            </div>
          </div>
          
          {/* 이전/재생/다음 버튼 영역 */}
          <div className="flex justify-between items-center mt-6">
            <Button 
              variant="outline" 
              className="rounded-full px-4 py-1 h-9 text-[#FF8FAB] border border-[#FFCCD5] bg-white hover:bg-[#FFF5F5]"
              onClick={() => {
                if (currentStep > 0) {
                  setCurrentStep(currentStep - 1);
                  setAutoPlay(false);
                }
              }}
              disabled={currentStep === 0}
            >
              이전 단계
            </Button>
            
            <button 
              className="flex items-center justify-center w-14 h-12 bg-transparent"
              onClick={toggleAutoPlay}
            >
              {!autoPlay ? (
                <svg className="w-10 h-10" fill="#FF0000" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="w-10 h-10" fill="#FF0000" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              )}
            </button>
            
            <Button 
              variant="outline"
              className="rounded-full px-4 py-1 h-9 text-[#FF8FAB] border border-[#FFCCD5] bg-white hover:bg-[#FFF5F5]"
              onClick={() => {
                if (currentStep < emergency.steps.length - 1) {
                  setCurrentStep(currentStep + 1);
                  setAutoPlay(false);
                }
              }}
              disabled={currentStep === emergency.steps.length - 1}
            >
              다음 단계
            </Button>
          </div>

          {/* 119 응급 전화 버튼 추가 */}
          <div className="mt-8">
            <Button 
              className="w-full py-3 bg-[#FF0000] hover:bg-[#CC0000] text-white font-bold rounded-full flex items-center justify-center"
              onClick={() => window.location.href = 'tel:119'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              119 응급 전화
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyDetail;