const TelegramBot = require('node-telegram-bot-api');
const CryptoBotDatabase = require('../database/db');

class CryptoSignalBot {
	constructor(token, options = {}) {
		this.bot = new TelegramBot(token, {
			polling: options.polling !== false,
			...options
		});

		this.db = new CryptoBotDatabase();
		this.setupCommands();
		this.setupMessageHandlers();
	}

	setupCommands() {
		// Handle /start command
		this.bot.onText(/\/start/, (msg) => {
			const chatId = msg.chat.id;
			const welcomeMessage = `
🤖 *Crypto Signal Bot*

Welcome! I'm your AI-powered cryptocurrency signal bot.

*Available Commands:*
/start - Show this welcome message
/help - Show help information
/status - Check bot status
/signals - Show recent signals
/config - Show current configuration

*Features:*
• AI-powered market analysis using GPT-5
• Real-time cryptocurrency signals
• Configurable timeframes
• Performance tracking

To get started, make sure you have configured your API keys in the environment variables.
            `;

			this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
		});

		// Handle /help command
		this.bot.onText(/\/help/, (msg) => {
			const chatId = msg.chat.id;
			const helpMessage = `
📚 *Help Guide*

*Commands:*
/start - Welcome message
/help - This help message
/status - Bot status and statistics
/signals - Recent trading signals
/config - Current bot configuration

*Signal Types:*
🟢 BUY - Recommended to buy
🔴 SELL - Recommended to sell
🟡 HOLD - Recommended to hold

*Timeframes:*
1m, 5m, 15m, 1h, 4h, 1d

*Contact Support:*
If you need help, check the documentation or contact the developer.
            `;

			this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
		});

		// Handle /status command
		this.bot.onText(/\/status/, async (msg) => {
			const chatId = msg.chat.id;
			try {
				const stats = this.db.getPerformanceStats();
				const recentSignals = this.db.getSignals(5);

				const statusMessage = `
📊 *Bot Status*

*Performance Statistics:*
• Total Signals: ${stats?.total_signals || 0}
• Average P/L: ${stats?.avg_profit_loss?.toFixed(2) || 0}%
• Profitable Signals: ${stats?.profitable_signals || 0}
• Losing Signals: ${stats?.losing_signals || 0}

*Recent Signals:*
${recentSignals.map(signal =>
					`• ${signal.cryptocurrency} ${signal.signal_type.toUpperCase()} (${signal.timeframe})`
				).join('\n') || 'No recent signals'}

*Bot Status:* ✅ Online
*Database:* ✅ Connected
            `;

				this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
			} catch (error) {
				console.error('Error getting status:', error);
				this.bot.sendMessage(chatId, '❌ Error getting status. Please try again.');
			}
		});

		// Handle /signals command
		this.bot.onText(/\/signals/, async (msg) => {
			const chatId = msg.chat.id;
			try {
				const signals = this.db.getSignals(10);

				if (signals.length === 0) {
					this.bot.sendMessage(chatId, '📭 No signals found.');
					return;
				}

				const signalsMessage = `
📈 *Recent Signals*

${signals.map(signal => {
					const emoji = signal.signal_type === 'buy' ? '🟢' :
						signal.signal_type === 'sell' ? '🔴' : '🟡';
					const confidence = (signal.confidence * 100).toFixed(1);
					return `${emoji} *${signal.cryptocurrency}* ${signal.signal_type.toUpperCase()}
   Timeframe: ${signal.timeframe}
   Confidence: ${confidence}%
   Price: $${signal.price || 'N/A'}
   Time: ${new Date(signal.created_at).toLocaleString()}`;
				}).join('\n\n')}
                `;

				this.bot.sendMessage(chatId, signalsMessage, { parse_mode: 'Markdown' });
			} catch (error) {
				console.error('Error getting signals:', error);
				this.bot.sendMessage(chatId, '❌ Error getting signals. Please try again.');
			}
		});

		// Handle /config command
		this.bot.onText(/\/config/, async (msg) => {
			const chatId = msg.chat.id;
			try {
				const timeframes = this.db.getConfig('timeframes');
				const cryptocurrencies = this.db.getConfig('cryptocurrencies');
				const aiModel = this.db.getConfig('ai_model');

				const configMessage = `
⚙️ *Bot Configuration*

*Supported Cryptocurrencies:*
${cryptocurrencies?.join(', ') || 'None configured'}

*Available Timeframes:*
${timeframes?.join(', ') || 'None configured'}

*AI Model:* ${aiModel || 'Not configured'}

*Signal Confidence Threshold:* ${this.db.getConfig('signal_confidence_threshold') || 'Not set'}%

*Max Signals per Hour:* ${this.db.getConfig('max_signals_per_hour') || 'Not set'}
                `;

				this.bot.sendMessage(chatId, configMessage, { parse_mode: 'Markdown' });
			} catch (error) {
				console.error('Error getting config:', error);
				this.bot.sendMessage(chatId, '❌ Error getting configuration. Please try again.');
			}
		});
	}

	setupMessageHandlers() {
		// Handle all other messages
		this.bot.on('message', (msg) => {
			if (!msg.text?.startsWith('/')) {
				const chatId = msg.chat.id;
				this.bot.sendMessage(chatId,
					'🤖 I only respond to commands. Use /help to see available commands.');
			}
		});

		// Handle errors
		this.bot.on('error', (error) => {
			console.error('Telegram Bot Error:', error);
		});

		// Handle polling errors
		this.bot.on('polling_error', (error) => {
			console.error('Telegram Bot Polling Error:', error);
		});
	}

	// Send signal to all active chats
	async sendSignal(signalData) {
		try {
			const chats = this.db.getActiveTelegramChats();

			if (chats.length === 0) {
				console.log('No active Telegram chats found');
				return;
			}

			const emoji = signalData.signal_type === 'buy' ? '🟢' :
				signalData.signal_type === 'sell' ? '🔴' : '🟡';

			const confidence = (signalData.confidence * 100).toFixed(1);

			const message = `
${emoji} *${signalData.signal_type.toUpperCase()} SIGNAL*

*Cryptocurrency:* ${signalData.cryptocurrency}
*Timeframe:* ${signalData.timeframe}
*Price:* $${signalData.price || 'N/A'}
*Confidence:* ${confidence}%

*AI Reasoning:*
${signalData.ai_reasoning || 'No reasoning provided'}

*Technical Indicators:*
${signalData.technical_indicators ?
					Object.entries(JSON.parse(signalData.technical_indicators))
						.map(([key, value]) => `• ${key}: ${value}`)
						.join('\n') : 'No indicators available'}

*Time:* ${new Date().toLocaleString()}

⚠️ *This is not financial advice. Always do your own research.*
            `;

			for (const chat of chats) {
				try {
					await this.bot.sendMessage(chat.chat_id, message, {
						parse_mode: 'Markdown'
					});
					console.log(`Signal sent to chat ${chat.chat_id}`);
				} catch (error) {
					console.error(`Failed to send signal to chat ${chat.chat_id}:`, error);
				}
			}
		} catch (error) {
			console.error('Error sending signal:', error);
		}
	}

	// Start the bot
	start() {
		console.log('Starting Telegram Bot...');
		this.bot.on('polling_error', (error) => {
			console.error('Polling error:', error);
		});
	}

	// Stop the bot
	stop() {
		console.log('Stopping Telegram Bot...');
		this.bot.stopPolling();
		this.db.close();
	}
}

module.exports = CryptoSignalBot;
