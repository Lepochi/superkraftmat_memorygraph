/**
 * Memory Framework Configuration
 * Research-backed tiered approach for optimal context management
 */

const MEMORY_FRAMEWORK = {
    // Tier 1: Business Intelligence (always retrieved)
    // Core business context that provides consistent foundation
    TIER_1_BUSINESS_INTELLIGENCE: {
        priority: 1,
        retrievalStrategy: 'always',
        maxTokens: 500,
        categories: {
            CURRENT_STATUS: {
                entityTypes: ['business_status', 'quarterly_focus', 'immediate_priorities'],
                refreshInterval: 'weekly',
                contextWeight: 0.3
            },
            STRATEGIC_VISION: {
                entityTypes: ['business_vision', 'long_term_goals', 'market_position'],
                refreshInterval: 'monthly',
                contextWeight: 0.25
            },
            PRODUCT_ECOSYSTEM: {
                entityTypes: ['product_catalog', 'product_synergies', 'key_products'],
                refreshInterval: 'monthly',
                contextWeight: 0.25
            },
            RELATIONSHIP_MAP: {
                entityTypes: ['key_contacts', 'supplier_network', 'customer_segments'],
                refreshInterval: 'monthly',
                contextWeight: 0.2
            }
        }
    },

    // Tier 2: Project Momentum (context-sensitive)
    // Active work and development context
    TIER_2_PROJECT_MOMENTUM: {
        priority: 2,
        retrievalStrategy: 'contextual',
        maxTokens: 300,
        categories: {
            ACTIVE_PROJECTS: {
                entityTypes: ['current_projects', 'development_work', 'implementations'],
                triggers: ['project', 'development', 'implementation', 'build', 'create'],
                contextWeight: 0.4
            },
            SYSTEM_IMPLEMENTATIONS: {
                entityTypes: ['technical_systems', 'integrations', 'configurations'],
                triggers: ['system', 'integration', 'setup', 'configuration', 'technical'],
                contextWeight: 0.35
            },
            DEVELOPMENT_CONTEXT: {
                entityTypes: ['coding_context', 'technical_decisions', 'architecture'],
                triggers: ['code', 'development', 'architecture', 'technical', 'framework'],
                contextWeight: 0.25
            }
        }
    },

    // Tier 3: Operational Context (on-demand)
    // Detailed information retrieved when specifically needed
    TIER_3_OPERATIONAL_CONTEXT: {
        priority: 3,
        retrievalStrategy: 'onDemand',
        maxTokens: 200,
        categories: {
            SUPPLIER_STORIES: {
                entityTypes: ['supplier_details', 'farm_stories', 'traceability'],
                triggers: ['supplier', 'farm', 'story', 'traceability', 'source'],
                contextWeight: 0.4
            },
            TECHNICAL_SPECS: {
                entityTypes: ['technical_specifications', 'detailed_configs', 'procedures'],
                triggers: ['specification', 'config', 'procedure', 'technical', 'setup'],
                contextWeight: 0.35
            },
            PROCESS_KNOWLEDGE: {
                entityTypes: ['workflows', 'best_practices', 'historical_knowledge'],
                triggers: ['process', 'workflow', 'best_practice', 'how_to'],
                contextWeight: 0.25
            }
        }
    }
};

const INTELLIGENCE_FEATURES = {
    // Pattern detection for automatic updates
    PATTERN_DETECTION: {
        enabled: true,
        patterns: {
            STATUS_CHANGE: {
                triggers: ['completed', 'finished', 'done', 'launched', 'deployed'],
                action: 'updateBusinessStatus',
                confidence: 0.8
            },
            NEW_PROJECT: {
                triggers: ['starting', 'beginning', 'new project', 'launching', 'initiating'],
                action: 'createProjectContext',
                confidence: 0.7
            },
            RELATIONSHIP_CHANGE: {
                triggers: ['hired', 'left', 'joined', 'promoted', 'new contact'],
                action: 'updateRelationshipMap',
                confidence: 0.8
            },
            SYSTEM_CHANGE: {
                triggers: ['migrating', 'implementing', 'upgrading', 'switching'],
                action: 'updateSystemContext',
                confidence: 0.75
            }
        }
    },

    // Context inheritance for related entities
    CONTEXT_INHERITANCE: {
        enabled: true,
        rules: {
            PROJECT_TO_COMPANY: {
                inherit: ['business_context', 'stakeholders', 'goals'],
                weight: 0.7
            },
            PERSON_TO_COMPANY: {
                inherit: ['company_context', 'business_relationship'],
                weight: 0.8
            },
            PRODUCT_TO_BUSINESS: {
                inherit: ['market_context', 'strategic_importance'],
                weight: 0.6
            }
        }
    },

    // Selective loading based on context relevance
    SELECTIVE_LOADING: {
        enabled: true,
        strategies: {
            SEMANTIC_SIMILARITY: {
                threshold: 0.6,
                method: 'cosine',
                weight: 0.4
            },
            KEYWORD_MATCHING: {
                threshold: 0.5,
                fuzzy: true,
                weight: 0.3
            },
            RECENCY_BIAS: {
                decayRate: 0.1,
                weight: 0.3
            }
        }
    }
};

const OPTIMIZATION_SETTINGS = {
    // Context window management
    CONTEXT_WINDOW: {
        maxTokens: 1000,
        reserveForResponse: 200,
        priorityDistribution: {
            tier1: 0.5,
            tier2: 0.3,
            tier3: 0.2
        }
    },

    // Performance settings
    PERFORMANCE: {
        cacheTimeout: 300000, // 5 minutes
        batchSize: 50,
        maxConcurrentQueries: 5,
        responseTimeout: 5000
    },

    // Quality control
    QUALITY_CONTROL: {
        minConfidence: 0.6,
        maxAge: 2592000000, // 30 days in milliseconds
        duplicateThreshold: 0.9,
        relevanceThreshold: 0.5
    }
};

module.exports = {
    MEMORY_FRAMEWORK,
    INTELLIGENCE_FEATURES,
    OPTIMIZATION_SETTINGS
};
