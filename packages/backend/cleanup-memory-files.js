const fs = require('fs');
const path = require('path');

function cleanupMemoryFiles() {
	console.log('🧹 Cleaning up :memory: files...');

	const projectDir = path.resolve(__dirname);
	let cleanedCount = 0;

	try {
		const files = fs.readdirSync(projectDir);
		files.forEach(file => {
			if (file.startsWith(':memory:')) {
				const filePath = path.join(projectDir, file);
				try {
					fs.unlinkSync(filePath);
					console.log(`✅ Cleaned up: ${file}`);
					cleanedCount++;
				} catch (error) {
					console.warn(`⚠️ Could not delete ${file}:`, error.message);
				}
			}
		});

		if (cleanedCount === 0) {
			console.log('✨ No :memory: files found to clean');
		} else {
			console.log(`🎉 Successfully cleaned ${cleanedCount} :memory: files`);
		}

	} catch (error) {
		console.error('❌ Error during cleanup:', error.message);
	}
}

// Run cleanup if called directly
if (require.main === module) {
	cleanupMemoryFiles();
}

module.exports = { cleanupMemoryFiles };
