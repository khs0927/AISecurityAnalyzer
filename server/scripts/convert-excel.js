/**
 * 엑셀 파일을 CSV로 변환하는 스크립트
 * 
 * 사용법:
 * node convert-excel.js <엑셀파일경로> <CSV출력경로>
 * 
 * 예시:
 * node convert-excel.js ../../attached_assets/1.병원정보서비스\ 2024.12.xlsx ./data/hospital_data.csv
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 커맨드 라인 인수 처리
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('사용법: node convert-excel.js <엑셀파일경로> <CSV출력경로>');
  process.exit(1);
}

const excelFilePath = args[0];
const csvOutputPath = args[1];

// 디렉토리 경로 확인 및 생성
const outputDir = path.dirname(csvOutputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`출력 디렉토리 생성: ${outputDir}`);
}

try {
  // Python을 사용하여 엑셀을 CSV로 변환 (pandas 필요)
  const pythonScript = `
import pandas as pd
import sys

excel_path = "${excelFilePath.replace(/\\/g, '\\\\')}"
csv_path = "${csvOutputPath.replace(/\\/g, '\\\\')}"

try:
    # 엑셀 파일 읽기
    df = pd.read_excel(excel_path)
    
    # CSV로 저장
    df.to_csv(csv_path, index=False, encoding='utf-8')
    print(f"변환 완료: {excel_path} -> {csv_path}")
    
    # 미리보기 출력
    print("\\n데이터 미리보기 (처음 5행):")
    print(df.head().to_string())
    print(f"\\n총 {len(df)}개 행이 처리되었습니다.")
except Exception as e:
    print(f"오류 발생: {str(e)}")
    sys.exit(1)
  `;

  // 임시 Python 스크립트 파일 생성
  const tempPythonFile = path.join(outputDir, '_temp_convert_excel.py');
  fs.writeFileSync(tempPythonFile, pythonScript);

  // Python 스크립트 실행
  console.log(`엑셀 파일 변환 중: ${excelFilePath}`);
  const output = execSync(`python ${tempPythonFile}`, { encoding: 'utf8' });
  console.log(output);

  // 임시 파일 삭제
  fs.unlinkSync(tempPythonFile);
  console.log('변환 완료');
} catch (error) {
  console.error('변환 오류:', error.message);
  if (error.stdout) console.log('출력:', error.stdout);
  if (error.stderr) console.error('오류 출력:', error.stderr);
  process.exit(1);
}