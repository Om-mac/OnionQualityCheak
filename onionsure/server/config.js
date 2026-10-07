/**
 * OnionSure — Runtime configuration & tunable parameters.
 *
 * All grading thresholds and fusion weights are intentionally configurable
 * (per spec section 8 / 24). Override via environment variables or edit here.
 */

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 10000,
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'onionsure-dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  authRateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  usePython: process.env.USE_PYTHON === 'true', // call python AI services when true
  pythonBin: process.env.PYTHON_BIN || 'python3',

  /**
   * Fusion weights — confidence-weighted multimodal fusion.
   * final = wVision*cVision + wGas*cGas + wEnv*cEnv  (normalized to 0..100)
   * These are the DEFAULTS; the admin dashboard can tune them at runtime
   * via PATCH /api/config/fusion.
   */
  fusion: {
    weights: {
      vision: parseFloat(process.env.FUSION_WEIGHT_VISION || '0.45'),
      gas: parseFloat(process.env.FUSION_WEIGHT_GAS || '0.35'),
      environment: parseFloat(process.env.FUSION_WEIGHT_ENV || '0.20'),
    },
    // Early-spoilage alert: vision looks healthy but gas risk is high.
    earlySpoilage: {
      visionHealthyAbove: parseFloat(process.env.ALERT_VISION_ABOVE || '78'),
      gasRiskHighAt: process.env.ALERT_GAS_RISK || 'HIGH',
    },
  },

  /**
   * Configurable grading thresholds (spec section 8 / 20).
   * finalScore >= gradeA -> GRADE A
   * finalScore >= urs    -> URS
   * else                 -> REJECTED
   */
  grading: {
    gradeA: parseFloat(process.env.GRADE_A_THRESHOLD || '85'),
    urs: parseFloat(process.env.URS_THRESHOLD || '65'),
  },

  /**
   * Gas / environmental risk model (DEMO thresholds).
   * Real Random-Forest model path documented in python/gas_quality_detector.py.
   */
  gas: {
    ethaneElevated: parseFloat(process.env.ETHANE_ELEVATED || '0.40'), // ppm
    methaneElevated: parseFloat(process.env.METHANE_ELEVATED || '0.20'), // ppm
    tempWarn: parseFloat(process.env.TEMP_WARN || '27'), // °C
    humidityWarn: parseFloat(process.env.HUMIDITY_WARN || '70'), // %
  },

  sensor: {
    stabilizationSeconds: parseInt(process.env.SENSOR_DWELL || '60', 10),
  },
};

module.exports = config;
