import { prisma } from '../db/prisma';
import { logger } from '../logger';
import pricingConfig from './config/pricing.json';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export function estimateModelCost(model: string, usage: TokenUsage): number {
  const modelName = model.toLowerCase();
  
  // Dynamic lookup in pricing configuration
  let inputRatePerMillion = pricingConfig.default.input;
  let outputRatePerMillion = pricingConfig.default.output;
  
  const entries = Object.entries(pricingConfig) as Array<[string, { input: number; output: number }]>;
  for (const [key, rates] of entries) {
    if (key !== 'default' && modelName.includes(key)) {
      inputRatePerMillion = rates.input;
      outputRatePerMillion = rates.output;
      break;
    }
  }

  // Allow dynamic environment variable overrides for model rates
  const normalizedModelKey = modelName.toUpperCase().replace(/[-.]/g, '_');
  const envInputRate = process.env[`AI_RATE_INPUT_${normalizedModelKey}`];
  const envOutputRate = process.env[`AI_RATE_OUTPUT_${normalizedModelKey}`];

  if (envInputRate) inputRatePerMillion = parseFloat(envInputRate);
  if (envOutputRate) outputRatePerMillion = parseFloat(envOutputRate);

  const inputCost = (usage.promptTokens / 1_000_000) * inputRatePerMillion;
  const outputCost = (usage.completionTokens / 1_000_000) * outputRatePerMillion;
  
  return inputCost + outputCost;
}

export async function trackAiUsage(userId: string, model: string, usage: TokenUsage) {
  try {
    const estimatedCost = estimateModelCost(model, usage);
    
    const log = await prisma.aiUsage.create({
      data: {
        userId,
        model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        estimatedCost,
      }
    });

    logger.info('Tracked AI usage & cost successfully', {
      userId,
      model,
      usage,
      estimatedCost,
      logId: log.id
    });

    // Cost threshold alerts: Retrieve daily accumulated cost
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const dailySummary = await prisma.aiUsage.aggregate({
      where: {
        userId,
        createdAt: {
          gte: startOfDay
        }
      },
      _sum: {
        estimatedCost: true
      }
    });

    const dailyCost = dailySummary._sum.estimatedCost || 0;
    const thresholdLimit = parseFloat(process.env.AI_DAILY_COST_LIMIT || '5.0');

    if (dailyCost >= thresholdLimit) {
      logger.warn('ALERT: User daily AI cost threshold exceeded', {
        userId,
        dailyCost,
        thresholdLimit,
        alertType: 'AI_DAILY_COST_SPIKE'
      });
    }

    return log;
  } catch (err) {
    logger.error('Failed to log AI usage to database', err, { userId, model, usage });
  }
}
