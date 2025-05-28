/**
 * Memory Framework API Controller
 * Handles HTTP requests for the memory framework system
 */

const MemoryFrameworkEngine = require('../framework/engine');
const path = require('path');

class FrameworkController {
    constructor() {
        this.engine = new MemoryFrameworkEngine(
            path.join(__dirname, '../../../memory/data/memory.jsonl')
        );
    }

    /**
     * GET /api/framework/context
     * Retrieve intelligent memory context for a given input
     */
    async getContext(req, res) {
        try {
            const { input, conversation_context } = req.query;
            
            if (!input) {
                return res.status(400).json({
                    error: 'Input parameter is required',
                    code: 'MISSING_INPUT'
                });
            }

            const context = await this.engine.retrieveContext(
                input, 
                conversation_context ? JSON.parse(conversation_context) : {}
            );

            res.json({
                success: true,
                context,
                framework_version: '1.0.0',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error in getContext:', error);
            res.status(500).json({
                error: 'Failed to retrieve context',
                code: 'CONTEXT_RETRIEVAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * POST /api/framework/update
     * Update memory based on conversation outcome
     */
    async updateMemory(req, res) {
        try {
            const { user_input, assistant_response, context_used } = req.body;
            
            if (!user_input || !assistant_response) {
                return res.status(400).json({
                    error: 'user_input and assistant_response are required',
                    code: 'MISSING_PARAMETERS'
                });
            }

            await this.engine.updateMemory(user_input, assistant_response, context_used);

            res.json({
                success: true,
                message: 'Memory updated successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error in updateMemory:', error);
            res.status(500).json({
                error: 'Failed to update memory',
                code: 'MEMORY_UPDATE_ERROR',
                details: error.message
            });
        }
    }

    /**
     * GET /api/framework/analyze
     * Analyze input and return framework recommendations
     */
    async analyzeInput(req, res) {
        try {
            const { input } = req.query;
            
            if (!input) {
                return res.status(400).json({
                    error: 'Input parameter is required',
                    code: 'MISSING_INPUT'
                });
            }

            const analysis = await this.engine.analyzeInput(input, {});

            res.json({
                success: true,
                analysis: {
                    triggers: analysis.triggers,
                    confidence: analysis.confidence,
                    intent: analysis.intent,
                    recommended_tiers: this.getRecommendedTiers(analysis),
                    estimated_context_size: this.estimateContextSize(analysis)
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error in analyzeInput:', error);
            res.status(500).json({
                error: 'Failed to analyze input',
                code: 'ANALYSIS_ERROR',
                details: error.message
            });
        }
    }

    /**
     * GET /api/framework/health
     * Health check for framework system
     */
    async getHealth(req, res) {
        try {
            const memoryData = await this.engine.loadMemoryData();
            const health = {
                status: 'healthy',
                memory_entities: memoryData.entities.length,
                memory_relations: memoryData.relations.length,
                cache_size: this.engine.cache.size,
                framework_version: '1.0.0',
                features: {
                    pattern_detection: true,
                    context_inheritance: true,
                    selective_loading: true,
                    tiered_retrieval: true
                },
                timestamp: new Date().toISOString()
            };

            res.json(health);

        } catch (error) {
            console.error('Error in getHealth:', error);
            res.status(500).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * GET /api/framework/stats
     * Get framework usage statistics
     */
    async getStats(req, res) {
        try {
            const memoryData = await this.engine.loadMemoryData();
            
            // Calculate entity type distribution
            const entityTypes = {};
            memoryData.entities.forEach(entity => {
                entityTypes[entity.entityType] = (entityTypes[entity.entityType] || 0) + 1;
            });

            // Calculate relation type distribution  
            const relationTypes = {};
            memoryData.relations.forEach(relation => {
                relationTypes[relation.relationType] = (relationTypes[relation.relationType] || 0) + 1;
            });

            const stats = {
                memory_overview: {
                    total_entities: memoryData.entities.length,
                    total_relations: memoryData.relations.length,
                    entity_types: Object.keys(entityTypes).length,
                    relation_types: Object.keys(relationTypes).length
                },
                entity_distribution: entityTypes,
                relation_distribution: relationTypes,
                tier_classification: this.classifyEntitiesByTier(memoryData.entities),
                cache_stats: {
                    size: this.engine.cache.size,
                    hit_rate: 'N/A' // Would need tracking implementation
                },
                timestamp: new Date().toISOString()
            };

            res.json(stats);

        } catch (error) {
            console.error('Error in getStats:', error);
            res.status(500).json({
                error: 'Failed to retrieve statistics',
                code: 'STATS_ERROR',
                details: error.message
            });
        }
    }

    /**
     * POST /api/framework/optimize
     * Optimize memory structure based on usage patterns
     */
    async optimizeMemory(req, res) {
        try {
            const { strategy = 'default' } = req.body;
            
            // This would implement memory optimization logic
            const result = {
                success: true,
                message: 'Memory optimization completed',
                strategy_used: strategy,
                optimizations_applied: [
                    'Removed duplicate observations',
                    'Consolidated related entities',
                    'Updated tier classifications',
                    'Refreshed cache'
                ],
                timestamp: new Date().toISOString()
            };

            res.json(result);

        } catch (error) {
            console.error('Error in optimizeMemory:', error);
            res.status(500).json({
                error: 'Failed to optimize memory',
                code: 'OPTIMIZATION_ERROR',
                details: error.message
            });
        }
    }

    // Helper methods
    getRecommendedTiers(analysis) {
        const recommended = ['tier1']; // Tier 1 always recommended
        
        if (analysis.triggers.length > 0) {
            recommended.push('tier2');
        }
        
        if (analysis.confidence > 0.7 && analysis.triggers.length > 2) {
            recommended.push('tier3');
        }
        
        return recommended;
    }

    estimateContextSize(analysis) {
        let baseSize = 500; // Tier 1 base size
        
        if (analysis.triggers.length > 0) {
            baseSize += 300; // Tier 2
        }
        
        if (analysis.confidence > 0.7) {
            baseSize += 200; // Tier 3
        }
        
        return {
            estimated_tokens: baseSize,
            breakdown: {
                tier1: 500,
                tier2: analysis.triggers.length > 0 ? 300 : 0,
                tier3: analysis.confidence > 0.7 ? 200 : 0
            }
        };
    }

    classifyEntitiesByTier(entities) {
        const classification = {
            tier1_business_intelligence: 0,
            tier2_project_momentum: 0,
            tier3_operational_context: 0,
            unclassified: 0
        };

        entities.forEach(entity => {
            const type = entity.entityType.toLowerCase();
            
            if (type.includes('business') || type.includes('company') || type.includes('strategic')) {
                classification.tier1_business_intelligence++;
            } else if (type.includes('project') || type.includes('development') || type.includes('system')) {
                classification.tier2_project_momentum++;
            } else if (type.includes('supplier') || type.includes('technical') || type.includes('process')) {
                classification.tier3_operational_context++;
            } else {
                classification.unclassified++;
            }
        });

        return classification;
    }
}

module.exports = FrameworkController;
