/**
 * ECG Simulator
 * 
 * Generates realistic ECG waveforms for demonstration purposes
 */

// Enum for different ECG patterns
export enum ECGPattern {
  NORMAL = 'normal',
  TACHYCARDIA = 'tachycardia',
  BRADYCARDIA = 'bradycardia',
  AFIB = 'atrial_fibrillation',
  ST_ELEVATION = 'st_elevation', // Indicative of myocardial infarction
  PVC = 'premature_ventricular_contraction'
}

// ECG configuration interface
interface ECGConfig {
  pattern: ECGPattern;
  heartRate: number; // in BPM
  duration: number; // in seconds
  amplitude: number; // Baseline amplitude
  noise: number; // Noise level (0-1)
}

// Default normal ECG config
const defaultConfig: ECGConfig = {
  pattern: ECGPattern.NORMAL,
  heartRate: 72,
  duration: 10,
  amplitude: 1,
  noise: 0.03
};

// Generate base PQRST complex (one heartbeat)
function generatePQRST(config: ECGConfig): number[] {
  const { pattern, amplitude } = config;
  
  // Base points for a single PQRST complex
  let points: number[] = [];
  
  // Baseline ECG with default values
  // P wave
  for (let i = 0; i < 10; i++) {
    points.push(0.2 * amplitude * Math.sin(i / 10 * Math.PI));
  }
  
  // PQ segment
  for (let i = 0; i < 5; i++) {
    points.push(0);
  }
  
  // QRS complex
  points.push(-0.3 * amplitude); // Q
  points.push(1.2 * amplitude);  // R
  points.push(-0.2 * amplitude); // S
  
  // ST segment
  for (let i = 0; i < 10; i++) {
    // Normal flat ST segment
    points.push(0);
  }
  
  // T wave
  for (let i = 0; i < 15; i++) {
    points.push(0.3 * amplitude * Math.sin(i / 15 * Math.PI));
  }
  
  // TP segment (return to baseline)
  for (let i = 0; i < 20; i++) {
    points.push(0);
  }
  
  // Modify the pattern based on the ECG type
  switch (pattern) {
    case ECGPattern.TACHYCARDIA:
      // Just faster rate with slightly different morphology
      points = points.map(p => p * 0.9); // Slightly reduced amplitude
      break;
      
    case ECGPattern.BRADYCARDIA:
      // Just slower rate with wider complexes
      // Adding more points to TP segment
      for (let i = 0; i < 10; i++) {
        points.push(0);
      }
      break;
      
    case ECGPattern.AFIB:
      // Replace P waves with irregular fibrillation
      for (let i = 0; i < 10; i++) {
        points[i] = 0.1 * amplitude * Math.sin(i * 3 + Math.random() * 2);
      }
      // Make RR intervals irregular
      const extendBy = Math.floor(Math.random() * 10);
      for (let i = 0; i < extendBy; i++) {
        points.push(0);
      }
      break;
      
    case ECGPattern.ST_ELEVATION:
      // Elevated ST segment (indicative of MI)
      const stStart = 18; // Starting index of ST segment
      for (let i = 0; i < 10; i++) {
        points[stStart + i] = 0.3 * amplitude;
      }
      break;
      
    case ECGPattern.PVC:
      // Modify to create a PVC
      // Replace normal QRS with wide, negative complex
      const qrsStart = 15;
      points[qrsStart] = -0.5 * amplitude;
      points[qrsStart + 1] = -1.2 * amplitude;
      points[qrsStart + 2] = -0.5 * amplitude;
      // Inverted T wave
      const tStart = 28;
      for (let i = 0; i < 15; i++) {
        points[tStart + i] = -0.3 * amplitude * Math.sin(i / 15 * Math.PI);
      }
      break;
  }
  
  return points;
}

// Add random noise to the signal
function addNoise(data: number[], noiseLevel: number): number[] {
  return data.map(point => {
    return point + (Math.random() * 2 - 1) * noiseLevel;
  });
}

// Generate full ECG signal
export function generateECG(config: Partial<ECGConfig> = {}): number[] {
  // Merge provided config with default config
  const fullConfig: ECGConfig = { ...defaultConfig, ...config };
  
  const { heartRate, duration } = fullConfig;
  
  // Calculate number of beats based on heart rate and duration
  const beatsPerSecond = heartRate / 60;
  const totalBeats = Math.ceil(beatsPerSecond * duration);
  
  // Generate base PQRST
  const basePQRST = generatePQRST(fullConfig);
  
  // Repeat PQRST to create full ECG
  let fullECG: number[] = [];
  
  for (let i = 0; i < totalBeats; i++) {
    // For AF, add some variability in the R-R interval
    if (fullConfig.pattern === ECGPattern.AFIB) {
      // Random variation in the beat timing
      if (Math.random() > 0.7) {
        // Add extra baseline points for irregular rhythm
        const extraPoints = Math.floor(Math.random() * 15);
        for (let j = 0; j < extraPoints; j++) {
          fullECG.push(0);
        }
      }
    }
    
    // For PVCs, randomly replace normal beats
    if (fullConfig.pattern === ECGPattern.PVC && i > 0 && Math.random() > 0.7) {
      // Generate a PVC beat
      const pvcConfig = { ...fullConfig, pattern: ECGPattern.PVC };
      const pvcBeat = generatePQRST(pvcConfig);
      fullECG = [...fullECG, ...pvcBeat];
    } else {
      // Regular beat
      fullECG = [...fullECG, ...basePQRST];
    }
  }
  
  // Add noise to make it more realistic
  return addNoise(fullECG, fullConfig.noise);
}

// Generate ECG data at regular intervals (simulate real-time)
export function startECGSimulation(
  pattern: ECGPattern = ECGPattern.NORMAL, 
  callback: (data: number) => void, 
  intervalMs: number = 20
): () => void {
  // Configure the ECG
  const config: ECGConfig = {
    ...defaultConfig,
    pattern
  };
  
  // Set heart rate based on pattern
  switch (pattern) {
    case ECGPattern.TACHYCARDIA:
      config.heartRate = 120;
      break;
    case ECGPattern.BRADYCARDIA:
      config.heartRate = 45;
      break;
    case ECGPattern.AFIB:
      config.heartRate = 110;
      break;
    case ECGPattern.ST_ELEVATION:
      config.heartRate = 90;
      break;
    case ECGPattern.PVC:
      config.heartRate = 85;
      break;
  }
  
  // Generate full ECG data
  const ecgData = generateECG(config);
  
  let currentIndex = 0;
  
  // Start the interval
  const intervalId = setInterval(() => {
    // Send the current data point
    callback(ecgData[currentIndex]);
    
    // Move to next point, loop back to beginning if we reach the end
    currentIndex = (currentIndex + 1) % ecgData.length;
  }, intervalMs);
  
  // Return function to stop simulation
  return () => clearInterval(intervalId);
}
