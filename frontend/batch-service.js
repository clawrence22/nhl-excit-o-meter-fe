// NHL Excite-o-Meter Batch API Service
class BatchExcitementService {
    constructor() {
        this.apiBase = CONFIG.API_BASE;
    }

    async getBatchExcitement(gameIds) {
        if (!gameIds || gameIds.length === 0) {
            throw new Error('Game IDs array is required');
        }

        const idsParam = gameIds.join(',');
        const url = `${this.apiBase}/excitement/batch?ids=${idsParam}`;

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Batch excitement API error:', error);
            throw error;
        }
    }
}

// Global instance
const batchService = new BatchExcitementService();

// Export for use in other scripts
window.getBatchExcitement = (gameIds) => batchService.getBatchExcitement(gameIds);