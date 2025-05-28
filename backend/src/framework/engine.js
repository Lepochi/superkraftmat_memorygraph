/**
 * Memory Framework Core Engine
 * Implements intelligent memory retrieval and management
 */

const { MEMORY_FRAMEWORK, INTELLIGENCE_FEATURES, OPTIMIZATION_SETTINGS } = require('./config');
const fs = require('fs').promises;
const path = require('path');

class MemoryFrameworkEngine {
    constructor(memoryFilePath) {
        this.memoryFilePath = memoryFilePath;
        this.cache = new Map();
        this.patternDetector = new PatternDetector();
        this.contextInheritance = new ContextInheritance();
        this.selectiveLoader = new SelectiveLoader();
    }

    /**
     * Retrieve memory context based on user input and conversation context
     * @param {string} userInput - The user's message
     * @param {Object} conversationContext - Current conversation metadata
     * @returns {Object} Structured memory context
     */
    async retrieveContext(userInput, conversationContext = {}) {
        try {
            const memoryData = await this.loadMemoryData();
            const analysis = await this.analyzeInput(userInput, conversationContext);
            
            // Build tiered context
            const context = {
                tier1: await this.getTier1Context(memoryData, analysis),
                tier2: await this.getTier2Context(memoryData, analysis),
                tier3: await this.getTier3Context(memoryData, analysis),
                metadata: {
                    timestamp: new Date().toISOString(),
                    tokenCount: 0,
                    confidence: analysis.confidence,
                    triggers: analysis.triggers
                }
            };

            // Optimize context within token limits
            const optimizedContext = await this.optimizeContext(context);
            
            // Cache result
            this.cacheResult(userInput, optimizedContext);
            
            return optimizedContext;
        } catch (error) {
            console.error('Error retrieving context:', error);
            return this.getEmergencyContext();
        }
    }

    /**
     * Update memory based on conversation outcomes
     * @param {string} userInput - Original user input
     * @param {string} assistantResponse - Claude's response
     * @param {Object} context - Context that was used
     */
    async updateMemory(userInput, assistantResponse, context) {
        try {
            const updates = await this.detectUpdates(userInput, assistantResponse, context);
            
            if (updates.length > 0) {
                await this.applyUpdates(updates);
                console.log(`Applied ${updates.length} memory updates`);
            }
            
            // Pattern detection for future optimization
            await this.patternDetector.learn(userInput, assistantResponse, context);
            
        } catch (error) {
            console.error('Error updating memory:', error);
        }
    }

    /**
     * Get Tier 1: Business Intelligence (always loaded)
     */
    async getTier1Context(memoryData, analysis) {
        const tier1Config = MEMORY_FRAMEWORK.TIER_1_BUSINESS_INTELLIGENCE;
        const entities = this.filterEntitiesByTypes(memoryData.entities, 
            this.getAllEntityTypes(tier1Config.categories));
        
        return {
            currentStatus: this.extractCategoryData(entities, 'CURRENT_STATUS'),
            strategicVision: this.extractCategoryData(entities, 'STRATEGIC_VISION'),
            productEcosystem: this.extractCategoryData(entities, 'PRODUCT_ECOSYSTEM'),
            relationshipMap: this.extractCategoryData(entities, 'RELATIONSHIP_MAP'),
            priority: tier1Config.priority,
            confidence: 1.0
        };
    }

    /**
     * Get Tier 2: Project Momentum (contextual)
     */
    async getTier2Context(memoryData, analysis) {
        const tier2Config = MEMORY_FRAMEWORK.TIER_2_PROJECT_MOMENTUM;
        const relevantCategories = this.getRelevantCategories(tier2Config.categories, analysis.triggers);
        
        if (relevantCategories.length === 0) {
            return { enabled: false, reason: 'No contextual triggers detected' };
        }

        const entities = this.filterEntitiesByRelevance(memoryData.entities, relevantCategories, analysis);
        
        return {
            activeProjects: this.extractCategoryData(entities, 'ACTIVE_PROJECTS'),
            systemImplementations: this.extractCategoryData(entities, 'SYSTEM_IMPLEMENTATIONS'),
            developmentContext: this.extractCategoryData(entities, 'DEVELOPMENT_CONTEXT'),
            priority: tier2Config.priority,
            confidence: analysis.confidence,
            triggeredBy: relevantCategories.map(cat => cat.name)
        };
    }

    /**
     * Get Tier 3: Operational Context (on-demand)
     */
    async getTier3Context(memoryData, analysis) {
        const tier3Config = MEMORY_FRAMEWORK.TIER_3_OPERATIONAL_CONTEXT;
        const explicitRequests = this.detectExplicitRequests(analysis.input, tier3Config.categories);
        
        if (explicitRequests.length === 0) {
            return { enabled: false, reason: 'No explicit operational context requested' };
        }

        const entities = this.filterEntitiesByExplicitRequest(memoryData.entities, explicitRequests);
        
        return {
            supplierStories: this.extractCategoryData(entities, 'SUPPLIER_STORIES'),
            technicalSpecs: this.extractCategoryData(entities, 'TECHNICAL_SPECS'),
            processKnowledge: this.extractCategoryData(entities, 'PROCESS_KNOWLEDGE'),
            priority: tier3Config.priority,
            confidence: 0.8,
            requestedBy: explicitRequests
        };
    }

    /**
     * Analyze user input for triggers and context requirements
     */
    async analyzeInput(userInput, conversationContext) {
        const triggers = this.extractTriggers(userInput);
        const confidence = this.calculateConfidence(triggers, userInput);
        const intent = this.detectIntent(userInput, triggers);
        
        return {
            input: userInput,
            triggers,
            confidence,
            intent,
            conversationContext,
            timestamp: new Date()
        };
    }

    /**
     * Extract trigger words from user input
     */
    extractTriggers(input) {
        const triggers = new Set();
        const inputLower = input.toLowerCase();
        
        // Check all framework categories for trigger words
        Object.values(MEMORY_FRAMEWORK).forEach(tier => {
            Object.values(tier.categories || {}).forEach(category => {
                if (category.triggers) {
                    category.triggers.forEach(trigger => {
                        if (inputLower.includes(trigger.toLowerCase())) {
                            triggers.add(trigger);
                        }
                    });
                }
            });
        });
        
        return Array.from(triggers);
    }

    /**
     * Load memory data from JSONL file
     */
    async loadMemoryData() {
        try {
            const cacheKey = `memory_${Date.now()}`;
            if (this.cache.has(cacheKey) && 
                Date.now() - this.cache.get(cacheKey).timestamp < OPTIMIZATION_SETTINGS.PERFORMANCE.cacheTimeout) {
                return this.cache.get(cacheKey).data;
            }

            const data = await fs.readFile(this.memoryFilePath, 'utf8');
            const lines = data.trim().split('\n');
            
            const entities = [];
            const relations = [];
            
            lines.forEach(line => {
                if (line.trim()) {
                    const entry = JSON.parse(line);
                    if (entry.type === 'entity') {
                        entities.push(entry);
                    } else if (entry.type === 'relation') {
                        relations.push(entry);
                    }
                }
            });

            const memoryData = { entities, relations };
            this.cache.set(cacheKey, { data: memoryData, timestamp: Date.now() });
            
            return memoryData;
        } catch (error) {
            console.error('Error loading memory data:', error);
            return { entities: [], relations: [] };
        }
    }

    /**
     * Optimize context to fit within token limits
     */
    async optimizeContext(context) {
        const settings = OPTIMIZATION_SETTINGS.CONTEXT_WINDOW;
        let tokenCount = this.estimateTokenCount(context);
        
        if (tokenCount <= settings.maxTokens) {
            context.metadata.tokenCount = tokenCount;
            return context;
        }

        // Apply token distribution strategy
        const optimized = {
            tier1: this.truncateContent(context.tier1, settings.maxTokens * settings.priorityDistribution.tier1),
            tier2: this.truncateContent(context.tier2, settings.maxTokens * settings.priorityDistribution.tier2),
            tier3: this.truncateContent(context.tier3, settings.maxTokens * settings.priorityDistribution.tier3),
            metadata: {
                ...context.metadata,
                tokenCount: settings.maxTokens,
                optimized: true,
                originalTokenCount: tokenCount
            }
        };

        return optimized;
    }

    /**
     * Utility methods
     */
    getAllEntityTypes(categories) {
        const types = [];
        Object.values(categories).forEach(category => {
            if (category.entityTypes) {
                types.push(...category.entityTypes);
            }
        });
        return types;
    }

    filterEntitiesByTypes(entities, types) {
        return entities.filter(entity => 
            types.some(type => 
                entity.entityType === type || 
                entity.entityType.toLowerCase().includes(type.toLowerCase())
            )
        );
    }

    extractCategoryData(entities, categoryName) {
        // Extract relevant observations and create structured data
        return entities.map(entity => ({
            name: entity.name,
            type: entity.entityType,
            key_observations: entity.observations.slice(0, 3), // Limit to most important
            category: categoryName
        }));
    }

    estimateTokenCount(obj) {
        // Rough token estimation (1 token ≈ 4 characters)
        return JSON.stringify(obj).length / 4;
    }

    truncateContent(content, maxTokens) {
        const estimated = this.estimateTokenCount(content);
        if (estimated <= maxTokens) return content;
        
        // Simple truncation strategy - can be enhanced
        const ratio = maxTokens / estimated;
        if (typeof content === 'object' && content !== null) {
            const truncated = { ...content };
            Object.keys(truncated).forEach(key => {
                if (Array.isArray(truncated[key])) {
                    truncated[key] = truncated[key].slice(0, Math.floor(truncated[key].length * ratio));
                }
            });
            return truncated;
        }
        return content;
    }

    getRelevantCategories(categories, triggers) {
        return Object.entries(categories)
            .filter(([name, category]) => 
                category.triggers && 
                category.triggers.some(trigger => triggers.includes(trigger))
            )
            .map(([name, category]) => ({ name, ...category }));
    }

    detectExplicitRequests(input, categories) {
        const requests = [];
        const inputLower = input.toLowerCase();
        
        Object.entries(categories).forEach(([name, category]) => {
            if (category.triggers && 
                category.triggers.some(trigger => inputLower.includes(trigger.toLowerCase()))) {
                requests.push(name);
            }
        });
        
        return requests;
    }

    calculateConfidence(triggers, input) {
        if (triggers.length === 0) return 0.3;
        if (triggers.length >= 3) return 0.9;
        if (triggers.length === 2) return 0.7;
        return 0.5;
    }

    detectIntent(input, triggers) {
        const inputLower = input.toLowerCase();
        
        if (inputLower.includes('create') || inputLower.includes('add') || inputLower.includes('new')) {
            return 'create';
        }
        if (inputLower.includes('update') || inputLower.includes('change') || inputLower.includes('modify')) {
            return 'update';
        }
        if (inputLower.includes('delete') || inputLower.includes('remove')) {
            return 'delete';
        }
        if (inputLower.includes('find') || inputLower.includes('search') || inputLower.includes('get')) {
            return 'retrieve';
        }
        
        return 'general';
    }

    getEmergencyContext() {
        return {
            tier1: { message: 'Emergency fallback - basic context only' },
            tier2: { enabled: false },
            tier3: { enabled: false },
            metadata: {
                emergency: true,
                timestamp: new Date().toISOString(),
                tokenCount: 50
            }
        };
    }

    async detectUpdates(userInput, assistantResponse, context) {
        // Pattern-based update detection
        const updates = [];
        
        // Check for status changes
        if (INTELLIGENCE_FEATURES.PATTERN_DETECTION.patterns.STATUS_CHANGE.triggers
            .some(trigger => assistantResponse.toLowerCase().includes(trigger))) {
            updates.push({
                type: 'status_update',
                confidence: INTELLIGENCE_FEATURES.PATTERN_DETECTION.patterns.STATUS_CHANGE.confidence,
                data: { input: userInput, response: assistantResponse }
            });
        }
        
        return updates;
    }

    async applyUpdates(updates) {
        // Apply detected updates to memory
        for (const update of updates) {
            console.log(`Applying update: ${update.type} (confidence: ${update.confidence})`);
            // Implementation would call appropriate memory update methods
        }
    }

    cacheResult(key, result) {
        if (this.cache.size > 100) {
            // Simple cache cleanup
            const oldest = [...this.cache.entries()][0];
            this.cache.delete(oldest[0]);
        }
        this.cache.set(key, { data: result, timestamp: Date.now() });
    }

    filterEntitiesByRelevance(entities, categories, analysis) {
        // Filter entities based on relevance to current context
        return entities.filter(entity => {
            return categories.some(category => 
                category.entityTypes && 
                category.entityTypes.includes(entity.entityType)
            );
        });
    }

    filterEntitiesByExplicitRequest(entities, requests) {
        // Filter entities based on explicit user requests
        return entities.filter(entity => {
            return requests.some(request => 
                entity.entityType.toLowerCase().includes(request.toLowerCase()) ||
                entity.observations.some(obs => 
                    obs.toLowerCase().includes(request.toLowerCase())
                )
            );
        });
    }
}

// Placeholder classes for advanced features
class PatternDetector {
    async learn(input, response, context) {
        // Implementation for pattern learning
    }
}

class ContextInheritance {
    // Implementation for context inheritance
}

class SelectiveLoader {
    // Implementation for selective loading
}

module.exports = MemoryFrameworkEngine;
