/**
 * Embedding Service for Semantic Search
 * Handles vector embeddings generation and similarity calculations
 */

const OpenAI = require('openai');

class EmbeddingService {
    constructor() {
        // Initialize OpenAI client if API key is available
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        }) : null;
        
        this.model = 'text-embedding-3-small';
        this.dimensions = 1536; // Default dimension
        this.enabled = !!this.openai;
        
        console.log('🧠 EmbeddingService initialized:', this.enabled ? 'OpenAI enabled' : 'No API key - disabled');
    }

    /**
     * Generate embedding for text
     * @param {string} text - Text to embed
     * @param {object} options - Generation options
     * @returns {Promise<number[]>} Embedding vector
     */
    async generateEmbedding(text, options = {}) {
        if (!this.enabled) {
            throw new Error('Embedding service not available - no OpenAI API key');
        }

        if (!text || text.trim().length === 0) {
            throw new Error('Text cannot be empty');
        }

        try {
            // Clean text for embedding
            const cleanText = text.replace(/\n/g, ' ').trim();
            
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: cleanText,
                encoding_format: 'float',
                dimensions: options.dimensions || this.dimensions
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error('❌ Embedding generation failed:', error.message);
            throw new Error(`Embedding generation failed: ${error.message}`);
        }
    }

    /**
     * Generate embeddings for entities
     * Combines name, description, and metadata for richer embedding
     * @param {object} entity - Entity object
     * @returns {Promise<number[]>} Embedding vector
     */
    async generateEntityEmbedding(entity) {
        const parts = [entity.name];
        
        if (entity.description) {
            parts.push(entity.description);
        }
        
        // Add type context
        if (entity.type) {
            parts.push(`Type: ${entity.type}`);
        }
        
        // Add important metadata fields
        if (entity.metadata) {
            const metadata = typeof entity.metadata === 'string' 
                ? JSON.parse(entity.metadata) 
                : entity.metadata;
                
            // Add key metadata fields that provide semantic context
            if (metadata.tags && Array.isArray(metadata.tags)) {
                parts.push(`Tags: ${metadata.tags.join(', ')}`);
            }
            
            if (metadata.category) {
                parts.push(`Category: ${metadata.category}`);
            }
            
            if (metadata.context) {
                parts.push(metadata.context);
            }
        }
        
        const combinedText = parts.join('. ');
        return this.generateEmbedding(combinedText);
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {number[]} vecA - First vector
     * @param {number[]} vecB - Second vector
     * @returns {number} Similarity score (0-1)
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Search entities by semantic similarity
     * @param {string} query - Search query
     * @param {Array} entities - Array of entities with embeddings
     * @param {object} options - Search options
     * @returns {Promise<Array>} Sorted array of entities with similarity scores
     */
    async semanticSearch(query, entities, options = {}) {
        const { limit = 20, threshold = 0.1 } = options;

        if (!this.enabled) {
            console.warn('⚠️ Semantic search not available - falling back to traditional search');
            return [];
        }

        try {
            // Generate query embedding
            const queryEmbedding = await this.generateEmbedding(query);
            
            // Calculate similarities
            const results = entities
                .filter(entity => entity.embedding) // Only entities with embeddings
                .map(entity => {
                    const embedding = typeof entity.embedding === 'string' 
                        ? JSON.parse(entity.embedding) 
                        : entity.embedding;
                    
                    const similarity = this.cosineSimilarity(queryEmbedding, embedding);
                    
                    return {
                        ...entity,
                        _semanticScore: similarity,
                        _relevance: Math.round(similarity * 100)
                    };
                })
                .filter(entity => entity._semanticScore >= threshold)
                .sort((a, b) => b._semanticScore - a._semanticScore)
                .slice(0, limit);

            console.log(`🔍 Semantic search: "${query}" → ${results.length} results`);
            return results;
        } catch (error) {
            console.error('❌ Semantic search failed:', error.message);
            return [];
        }
    }

    /**
     * Hybrid search combining traditional and semantic search
     * @param {string} query - Search query
     * @param {Array} entities - Array of entities
     * @param {Function} traditionalSearch - Traditional search function
     * @param {object} options - Search options
     * @returns {Promise<Array>} Combined and deduplicated results
     */
    async hybridSearch(query, entities, traditionalSearch, options = {}) {
        const { semanticWeight = 0.7, traditionalWeight = 0.3, limit = 20 } = options;

        try {
            // Get traditional search results
            const traditionalResults = await traditionalSearch(query, entities, { limit: limit * 2 });
            
            // Get semantic search results if available
            let semanticResults = [];
            if (this.enabled) {
                semanticResults = await this.semanticSearch(query, entities, { limit: limit * 2 });
            }

            // Combine and deduplicate results
            const combinedResults = new Map();

            // Add traditional results
            traditionalResults.forEach(entity => {
                const traditionalScore = entity._relevance || 50;
                combinedResults.set(entity.id, {
                    ...entity,
                    _hybridScore: traditionalScore * traditionalWeight,
                    _traditionalScore: traditionalScore,
                    _semanticScore: 0
                });
            });

            // Add semantic results and boost scores
            semanticResults.forEach(entity => {
                const semanticScore = (entity._semanticScore || 0) * 100;
                const existing = combinedResults.get(entity.id);
                
                if (existing) {
                    // Boost existing entities found in both searches
                    existing._hybridScore = (existing._traditionalScore * traditionalWeight) + 
                                          (semanticScore * semanticWeight);
                    existing._semanticScore = semanticScore;
                } else {
                    // Add new semantic results
                    combinedResults.set(entity.id, {
                        ...entity,
                        _hybridScore: semanticScore * semanticWeight,
                        _traditionalScore: 0,
                        _semanticScore: semanticScore
                    });
                }
            });

            // Sort by hybrid score and return top results
            const finalResults = Array.from(combinedResults.values())
                .sort((a, b) => b._hybridScore - a._hybridScore)
                .slice(0, limit)
                .map(entity => ({
                    ...entity,
                    _relevance: Math.round(entity._hybridScore)
                }));

            console.log(`🔍 Hybrid search: "${query}" → ${traditionalResults.length} traditional + ${semanticResults.length} semantic = ${finalResults.length} final`);
            return finalResults;
        } catch (error) {
            console.error('❌ Hybrid search failed:', error.message);
            // Fallback to traditional search
            return traditionalSearch(query, entities, options);
        }
    }

    /**
     * Check if service is ready for semantic search
     * @returns {boolean} Service availability
     */
    isAvailable() {
        return this.enabled;
    }

    /**
     * Get service status and configuration
     * @returns {object} Status information
     */
    getStatus() {
        return {
            enabled: this.enabled,
            model: this.model,
            dimensions: this.dimensions,
            provider: this.enabled ? 'OpenAI' : 'None'
        };
    }
}

module.exports = EmbeddingService;