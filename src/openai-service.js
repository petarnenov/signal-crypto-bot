const OpenAI = require('openai');
const CryptoBotDatabase = require('../database/db');

class OpenAIService {
	constructor(apiKey, options = {}) {
		this.openai = new OpenAI({
			apiKey: apiKey,
			...options
		});

		this.db = new CryptoBotDatabase();
		this.model = options.model || 'gpt-4';
		this.temperature = options.temperature || 0.7;
		this.maxTokens = options.maxTokens || 500;
	}

	// Create prompt template for crypto analysis
	createAnalysisPrompt(cryptocurrency, timeframe, marketData, technicalIndicators) {
		return `You are a cryptocurrency trading bot. You must respond with ONLY valid JSON, no other text.

CRYPTOCURRENCY: ${cryptocurrency}
TIMEFRAME: ${timeframe}
CURRENT PRICE: ${marketData.currentPrice || 'N/A'}

TECHNICAL INDICATORS:
- RSI: ${technicalIndicators.rsi || 'N/A'}
- MACD: ${technicalIndicators.macd || 'N/A'}
- SMA: ${technicalIndicators.sma || 'N/A'}

CRITICAL: You must respond with ONLY this exact JSON format, no explanations, no other text:
{"signal":"BUY","confidence":0.8,"reasoning":"Brief analysis","risk_level":"MEDIUM"}

Remember: ONLY JSON, nothing else.`;
	}

	// Analyze cryptocurrency data using GPT-5
	async analyzeCryptocurrency(cryptocurrency, timeframe, marketData, technicalIndicators) {
		const startTime = Date.now();

		try {
			const prompt = this.createAnalysisPrompt(
				cryptocurrency,
				timeframe,
				marketData,
				technicalIndicators
			);

			const completion = await this.openai.chat.completions.create({
				model: this.model,
				messages: [
					{
						role: 'system',
						content: 'You are an expert cryptocurrency analyst. Provide accurate, data-driven trading signals based on market analysis. Always respond with valid JSON only.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_completion_tokens: this.maxTokens
			});

			const response = completion.choices[0].message.content;
			console.log('OpenAI Response:', response);
			console.log('Response length:', response.length);
			console.log('Response type:', typeof response);

			let analysis;
			try {
				analysis = JSON.parse(response);
			} catch (parseError) {
				console.error('JSON Parse Error:', parseError);
				console.error('Raw Response:', response);
				throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}`);
			}

			const analysisTime = Date.now() - startTime;
			const tokensUsed = completion.usage.total_tokens;
			const cost = this.calculateCost(tokensUsed);

			// Save analysis to database
			const analysisId = this.db.saveAIAnalysis({
				cryptocurrency,
				timeframe,
				marketData: marketData,
				aiResponse: response,
				tokensUsed: tokensUsed,
				cost: cost,
				analysisTimeMs: analysisTime
			});

			console.log(`AI Analysis completed for ${cryptocurrency} (${timeframe}) in ${analysisTime}ms`);
			console.log(`Tokens used: ${tokensUsed}, Cost: $${cost.toFixed(6)}`);

			return {
				...analysis,
				analysisId: analysisId,
				tokensUsed: tokensUsed,
				cost: cost,
				analysisTimeMs: analysisTime
			};

		} catch (error) {
			console.error('OpenAI Analysis Error:', error);
			throw new Error(`Failed to analyze ${cryptocurrency}: ${error.message}`);
		}
	}

	// Calculate cost based on token usage
	calculateCost(tokensUsed) {
		// GPT-5 pricing (approximate - check OpenAI pricing for current rates)
		const inputCostPer1k = 0.005; // $0.005 per 1K input tokens
		const outputCostPer1k = 0.015; // $0.015 per 1K output tokens

		// Assuming 70% input, 30% output tokens
		const inputTokens = Math.floor(tokensUsed * 0.7);
		const outputTokens = tokensUsed - inputTokens;

		const inputCost = (inputTokens / 1000) * inputCostPer1k;
		const outputCost = (outputTokens / 1000) * outputCostPer1k;

		return inputCost + outputCost;
	}

	// Generate signal based on AI analysis
	async generateSignal(cryptocurrency, timeframe, marketData, technicalIndicators) {
		try {
			const analysis = await this.analyzeCryptocurrency(
				cryptocurrency,
				timeframe,
				marketData,
				technicalIndicators
			);

			// Check confidence threshold
			const confidenceThreshold = this.db.getConfig('signal_confidence_threshold') || 0.7;

			if (analysis.confidence < confidenceThreshold) {
				console.log(`Signal confidence (${analysis.confidence}) below threshold (${confidenceThreshold})`);
				return null;
			}

			// Create signal data
			const signalData = {
				cryptocurrency: cryptocurrency,
				signalType: analysis.signal.toLowerCase(),
				timeframe: timeframe,
				price: marketData.currentPrice || null,
				confidence: analysis.confidence,
				aiReasoning: analysis.reasoning,
				technicalIndicators: technicalIndicators
			};

			// Validate signal type
			const validSignalTypes = ['buy', 'sell', 'hold'];
			if (!validSignalTypes.includes(signalData.signalType)) {
				console.error(`Invalid signal type: ${signalData.signalType}. Converting to 'hold'`);
				signalData.signalType = 'hold';
			}

			// Save signal to database
			const signalId = this.db.createSignal(signalData);

			console.log(`Signal generated: ${cryptocurrency} ${analysis.signal} (${timeframe}) - Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

			// Create signal object with ID
			const signal = {
				signalId: signalId,
				...signalData,
				analysis: analysis
			};

			// Broadcast signal generated after successful database save
			if (global.serverInstance && global.serverInstance.broadcastSignalGenerated) {
				global.serverInstance.broadcastSignalGenerated(signal);
			}

			return signal;

		} catch (error) {
			console.error('Signal Generation Error:', error);
			throw error;
		}
	}

	// Get analysis history
	getAnalysisHistory(cryptocurrency, limit = 50) {
		return this.db.getAIAnalysisHistory(cryptocurrency, limit);
	}

	// Test OpenAI connection
	async testConnection() {
		try {
			const completion = await this.openai.chat.completions.create({
				model: this.model,
				messages: [
					{
						role: 'user',
						content: 'Hello, this is a test message. Please respond with "Connection successful!"'
					}
				],
				max_tokens: 10
			});

			const response = completion.choices[0].message.content;
			console.log('OpenAI Connection Test:', response);
			return response.includes('successful');
		} catch (error) {
			console.error('OpenAI Connection Test Failed:', error);
			return false;
		}
	}

	// Get usage statistics
	async getUsageStats() {
		try {
			const response = await this.openai.usage.retrieve();
			return response;
		} catch (error) {
			console.error('Failed to get usage stats:', error);
			return null;
		}
	}
}

module.exports = OpenAIService;
