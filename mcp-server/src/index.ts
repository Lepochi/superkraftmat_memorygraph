#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { HybridDatabaseService } from './services/HybridDatabaseService.js';
import { ContextAnalyzer } from './services/contextAnalyzer.js';
import { TokenOptimizer } from './services/tokenOptimizer.js';
import { RailwayService } from './services/RailwayService.js';
import type { Memory } from './types/memory.js';

// Initialize server
const server = new Server(
  {
    name: 'superkraft-memory',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize hybrid database service
const db = new HybridDatabaseService();

// Initialize Railway service
const railway = new RailwayService();

// Error handling helper
const handleError = (error: unknown): McpError => {
  if (error instanceof McpError) return error;
  
  const message = error instanceof Error ? error.message : 'An unknown error occurred';
  return new McpError(ErrorCode.InternalError, message);
};

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'getMemories',
        description: 'Retrieve memories based on context and filters',
        inputSchema: {
          type: 'object',
          properties: {
            context: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'Current conversation topic' },
                recentEntities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Recently mentioned entity IDs'
                },
                depth: { type: 'number', description: 'Relationship traversal depth', default: 2 },
                tokenLimit: { type: 'number', description: 'Maximum tokens to return', default: 2000 }
              }
            },
            filters: {
              type: 'object',
              properties: {
                types: {
                  type: 'array',
                  items: { 
                    type: 'string',
                    enum: ['person', 'concept', 'event', 'task', 'insight', 'goal']
                  },
                  description: 'Filter by entity types'
                },
                minImportance: { type: 'number', description: 'Minimum importance score (0-1)' },
                limit: { type: 'number', description: 'Maximum number of entities', default: 20 }
              }
            }
          }
        }
      },
      {
        name: 'searchMemories',
        description: 'Search for memories by query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            options: {
              type: 'object',
              properties: {
                types: {
                  type: 'array',
                  items: { 
                    type: 'string',
                    enum: ['person', 'concept', 'event', 'task', 'insight', 'goal']
                  }
                },
                limit: { type: 'number', default: 10 },
                includeRelations: { type: 'boolean', default: false },
                includeObservations: { type: 'boolean', default: false }
              }
            }
          },
          required: ['query']
        }
      },
      {
        name: 'getEntity',
        description: 'Get detailed information about a specific entity',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Entity ID' },
            includeRelations: { type: 'boolean', default: true },
            includeObservations: { type: 'boolean', default: true },
            observationLimit: { type: 'number', default: 5 }
          },
          required: ['id']
        }
      },
      {
        name: 'getRelatedMemories',
        description: 'Get memories related to a specific entity',
        inputSchema: {
          type: 'object',
          properties: {
            entityId: { type: 'string', description: 'Starting entity ID' },
            depth: { type: 'number', description: 'Relationship traversal depth', default: 2 },
            limit: { type: 'number', description: 'Maximum number of related entities', default: 10 }
          },
          required: ['entityId']
        }
      },
      {
        name: 'updateMemory',
        description: 'Update an entity\'s information or importance',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Entity ID' },
            updates: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                importanceScore: { type: 'number', minimum: 0, maximum: 1 },
                metadata: { type: 'object' }
              }
            }
          },
          required: ['id', 'updates']
        }
      },
      // Railway Tools
      {
        name: 'railway_configure',
        description: 'Configure Railway API token for authentication',
        inputSchema: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Railway API token' }
          },
          required: ['token']
        }
      },
      {
        name: 'railway_project_list',
        description: 'List all projects in your Railway account',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'railway_project_info',
        description: 'Get detailed information about a specific project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' }
          },
          required: ['projectId']
        }
      },
      {
        name: 'railway_service_list',
        description: 'List all services in a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' }
          },
          required: ['projectId']
        }
      },
      {
        name: 'railway_variable_set',
        description: 'Set an environment variable',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
            environmentId: { type: 'string', description: 'Environment ID' },
            name: { type: 'string', description: 'Variable name' },
            value: { type: 'string', description: 'Variable value' },
            serviceId: { type: 'string', description: 'Service ID (optional)' }
          },
          required: ['projectId', 'environmentId', 'name', 'value']
        }
      },
      {
        name: 'railway_variable_list',
        description: 'List environment variables',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
            environmentId: { type: 'string', description: 'Environment ID' },
            serviceId: { type: 'string', description: 'Service ID (optional)' }
          },
          required: ['projectId', 'environmentId']
        }
      },
      {
        name: 'railway_deployment_trigger',
        description: 'Trigger a new deployment',
        inputSchema: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', description: 'Service ID' },
            environmentId: { type: 'string', description: 'Environment ID' }
          },
          required: ['serviceId', 'environmentId']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'getMemories': {
        const { context = {}, filters = {} } = args as any;
        
        // Analyze context to determine relevant entity types and keywords
        const contextAnalysis = ContextAnalyzer.analyzeContext(context);
        
        // Use context-aware entity types if not explicitly filtered
        const entityTypes = filters.types || contextAnalysis.entityTypes;
        const minImportance = filters.minImportance || contextAnalysis.importanceThreshold;
        
        // Get base entities
        const entities = await db.getEntities({
          types: entityTypes,
          minImportance: minImportance,
          limit: filters.limit || 30 // Get more initially for better filtering
        });
        
        // If we have recent entities, also get their related ones
        if (context.recentEntities && context.recentEntities.length > 0) {
          for (const recentId of context.recentEntities) {
            const related = await db.getRelatedEntities(recentId, 1); // One hop
            entities.push(...related.filter(e => !entities.find(ex => ex.id === e.id)));
          }
        }
        
        // Build memory objects
        const memories: Memory[] = [];
        const processedIds = new Set<string>();
        
        for (const entity of entities) {
          if (processedIds.has(entity.id)) continue;
          processedIds.add(entity.id);
          
          const memory: Memory = { entity };
          
          // Get relations if within depth
          if (context.depth && context.depth > 0) {
            memory.relations = await db.getRelations(entity.id);
          }
          
          // Get recent observations
          memory.observations = await db.getObservations(entity.id, 3);
          
          // Calculate score
          memory.score = await db.getEntityScore(entity.id);
          
          memories.push(memory);
        }
        
        // Apply context-aware filtering and sorting
        const filtered = ContextAnalyzer.filterByContext(memories, context);
        
        // Optimize for token limit
        const tokenLimit = context.tokenLimit || 2000;
        const optimized = TokenOptimizer.optimizeForTokens(filtered, tokenLimit);
        
        // Get token statistics
        const tokenStats = TokenOptimizer.getTokenStats(optimized);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                memories: optimized,
                stats: {
                  totalMemories: optimized.length,
                  totalTokens: tokenStats.totalTokens,
                  tokenLimit: tokenLimit
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'searchMemories': {
        const { query, options = {} } = args as any;
        
        const entities = await db.searchEntities(query, options.limit || 10);
        const memories: Memory[] = [];
        
        for (const entity of entities) {
          const memory: Memory = { entity };
          
          if (options.includeRelations) {
            memory.relations = await db.getRelations(entity.id);
          }
          
          if (options.includeObservations) {
            memory.observations = await db.getObservations(entity.id, 5);
          }
          
          memory.score = await db.getEntityScore(entity.id);
          memories.push(memory);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(memories, null, 2)
            }
          ]
        };
      }

      case 'getEntity': {
        const { id, includeRelations = true, includeObservations = true, observationLimit = 5 } = args as any;
        
        const entity = await db.getEntity(id);
        if (!entity) {
          throw new McpError(ErrorCode.InvalidRequest, `Entity ${id} not found`);
        }
        
        const memory: Memory = { entity };
        
        if (includeRelations) {
          memory.relations = await db.getRelations(id);
        }
        
        if (includeObservations) {
          memory.observations = await db.getObservations(id, observationLimit);
        }
        
        memory.score = await db.getEntityScore(id);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(memory, null, 2)
            }
          ]
        };
      }

      case 'getRelatedMemories': {
        const { entityId, depth = 2, limit = 10 } = args as any;
        
        const relatedEntities = await db.getRelatedEntities(entityId, depth);
        const memories: Memory[] = [];
        
        for (const entity of relatedEntities.slice(0, limit)) {
          const memory: Memory = { 
            entity,
            relations: await db.getRelations(entity.id),
            score: await db.getEntityScore(entity.id)
          };
          memories.push(memory);
        }
        
        memories.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(memories, null, 2)
            }
          ]
        };
      }

      case 'updateMemory': {
        const { id, updates } = args as any;
        
        await db.updateEntity(id, updates);
        const updatedEntity = await db.getEntity(id);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, entity: updatedEntity }, null, 2)
            }
          ]
        };
      }

      // Railway Tools
      case 'railway_configure': {
        const { token } = args as any;
        const result = await railway.configureApiToken(token);
        
        return {
          content: [
            {
              type: 'text',
              text: result.message
            }
          ]
        };
      }

      case 'railway_project_list': {
        const projects = await railway.projectList();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2)
            }
          ]
        };
      }

      case 'railway_project_info': {
        const { projectId } = args as any;
        const project = await railway.projectInfo(projectId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2)
            }
          ]
        };
      }

      case 'railway_service_list': {
        const { projectId } = args as any;
        const services = await railway.serviceList(projectId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(services, null, 2)
            }
          ]
        };
      }

      case 'railway_variable_set': {
        const { projectId, environmentId, name, value, serviceId } = args as any;
        const result = await railway.variableSet(projectId, environmentId, name, value, serviceId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'railway_variable_list': {
        const { projectId, environmentId, serviceId } = args as any;
        const variables = await railway.listServiceVariables(projectId, environmentId, serviceId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(variables, null, 2)
            }
          ]
        };
      }

      case 'railway_deployment_trigger': {
        const { serviceId, environmentId } = args as any;
        const deployment = await railway.deploymentTrigger(serviceId, environmentId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(deployment, null, 2)
            }
          ]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    throw handleError(error);
  }
});

// Start the server
async function main() {
  // Initialize hybrid database service
  await db.initialize({
    preferPerformance: true,  // Prefer local SQLite when available
    fallbackChain: true       // Enable automatic fallback
  });
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('🚀 Superkraft Memory MCP Server v2.0 started with hybrid backend');
  
  // Log backend status
  const statusReport = await db.getStatusReport();
  console.error('\n' + statusReport);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.error('🔌 Shutting down...');
    await db.close();
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});