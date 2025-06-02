/**
 * Railway Service - MCP Tools Integration
 * 
 * Provides Railway management tools for Claude Desktop MCP integration.
 * Replaces non-functional MCP Railway tools with direct GraphQL API access.
 */

import { RailwayAPIService } from './RailwayAPIService.js';

interface RailwayToolsConfig {
  apiToken?: string;
  endpoint?: string;
}

export class RailwayService {
  private apiService: RailwayAPIService | null = null;
  private isConfigured = false;

  constructor(config?: RailwayToolsConfig) {
    if (config?.apiToken) {
      this.configure(config.apiToken, config.endpoint);
    }
  }

  /**
   * Configure Railway API connection
   */
  configure(apiToken: string, endpoint?: string): void {
    this.apiService = new RailwayAPIService({
      apiToken,
      endpoint
    });
    this.isConfigured = true;
  }

  /**
   * Ensure API service is configured
   */
  private ensureConfigured(): RailwayAPIService {
    if (!this.isConfigured || !this.apiService) {
      throw new Error('Railway API not configured. Please provide your Railway API token first.');
    }
    return this.apiService;
  }

  // ============================================================================
  // MCP TOOL IMPLEMENTATIONS
  // ============================================================================

  /**
   * Configure Railway API token
   */
  async configureApiToken(token: string): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      this.configure(token);
      const api = this.ensureConfigured();
      
      const connectionTest = await api.testConnection();
      
      if (connectionTest.success) {
        return {
          success: true,
          message: `✅ Railway API configured successfully! Authenticated as ${connectionTest.user?.name} (${connectionTest.user?.email})`,
          user: connectionTest.user
        };
      } else {
        this.isConfigured = false;
        this.apiService = null;
        return {
          success: false,
          message: `❌ Failed to connect to Railway API: ${connectionTest.error}. Please check your token and try again.`
        };
      }
    } catch (error) {
      this.isConfigured = false;
      this.apiService = null;
      return {
        success: false,
        message: `❌ Configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * List all projects in your Railway account
   */
  async projectList(): Promise<any[]> {
    const api = this.ensureConfigured();
    const projects = await api.listProjects();
    
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description || '',
      teamId: project.teamId,
      isPublic: project.isPublic,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }));
  }

  /**
   * Get detailed information about a specific project
   */
  async projectInfo(projectId: string): Promise<any> {
    const api = this.ensureConfigured();
    const project = await api.getProjectInfo(projectId);
    
    return {
      id: project.id,
      name: project.name,
      description: project.description || '',
      teamId: project.teamId,
      isPublic: project.isPublic,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      services: project.services.map(service => ({
        id: service.id,
        name: service.name,
        icon: service.icon,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt
      })),
      environments: project.environments.map(env => ({
        id: env.id,
        name: env.name,
        isEphemeral: env.isEphemeral,
        createdAt: env.createdAt
      }))
    };
  }

  /**
   * Create a new Railway project
   */
  async projectCreate(name: string, teamId?: string): Promise<any> {
    const api = this.ensureConfigured();
    const project = await api.createProject(name, teamId);
    
    return {
      id: project.id,
      name: project.name,
      description: project.description || '',
      teamId: project.teamId,
      isPublic: project.isPublic,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  /**
   * Delete a project
   */
  async projectDelete(projectId: string): Promise<{ success: boolean }> {
    const api = this.ensureConfigured();
    const result = await api.deleteProject(projectId);
    return { success: result };
  }

  /**
   * List all environments in a project
   */
  async projectEnvironments(projectId: string): Promise<any[]> {
    const api = this.ensureConfigured();
    const environments = await api.listEnvironments(projectId);
    
    return environments.map(env => ({
      id: env.id,
      name: env.name,
      projectId: env.projectId,
      isEphemeral: env.isEphemeral,
      createdAt: env.createdAt
    }));
  }

  /**
   * List all services in a project
   */
  async serviceList(projectId: string): Promise<any[]> {
    const api = this.ensureConfigured();
    const services = await api.listServices(projectId);
    
    return services.map(service => ({
      id: service.id,
      name: service.name,
      projectId: service.projectId,
      icon: service.icon,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    }));
  }

  /**
   * Get detailed information about a service
   */
  async serviceInfo(serviceId: string): Promise<any> {
    const api = this.ensureConfigured();
    const service = await api.getServiceInfo(serviceId);
    
    return {
      id: service.id,
      name: service.name,
      projectId: service.projectId,
      icon: service.icon,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      deployments: service.deployments.map(deployment => ({
        id: deployment.id,
        status: deployment.status,
        serviceId: deployment.serviceId,
        environmentId: deployment.environmentId,
        createdAt: deployment.createdAt,
        url: deployment.url
      }))
    };
  }

  /**
   * Create a new service from a GitHub repository
   */
  async serviceCreateFromRepo(
    projectId: string,
    repo: string,
    name?: string
  ): Promise<any> {
    const api = this.ensureConfigured();
    
    // Get the first environment for the project
    const environments = await api.listEnvironments(projectId);
    if (environments.length === 0) {
      throw new Error('No environments found in project. Please create an environment first.');
    }
    
    const service = await api.createServiceFromRepo(
      projectId, 
      environments[0].id, 
      repo, 
      name
    );
    
    return {
      id: service.id,
      name: service.name,
      projectId: service.projectId,
      icon: service.icon,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    };
  }

  /**
   * Create a new service from a Docker image
   */
  async serviceCreateFromImage(
    projectId: string,
    image: string,
    name?: string
  ): Promise<any> {
    const api = this.ensureConfigured();
    
    // Get the first environment for the project
    const environments = await api.listEnvironments(projectId);
    if (environments.length === 0) {
      throw new Error('No environments found in project. Please create an environment first.');
    }
    
    const service = await api.createServiceFromImage(
      projectId, 
      environments[0].id, 
      image, 
      name
    );
    
    return {
      id: service.id,
      name: service.name,
      projectId: service.projectId,
      icon: service.icon,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    };
  }

  /**
   * List variables for a service or environment
   */
  async listServiceVariables(
    projectId: string,
    environmentId: string,
    serviceId?: string
  ): Promise<Record<string, string>> {
    const api = this.ensureConfigured();
    return await api.listVariables(projectId, environmentId, serviceId);
  }

  /**
   * Set a variable for a service or environment
   */
  async variableSet(
    projectId: string,
    environmentId: string,
    name: string,
    value: string,
    serviceId?: string
  ): Promise<{ success: boolean }> {
    const api = this.ensureConfigured();
    const result = await api.setVariable(projectId, environmentId, name, value, serviceId);
    return { success: result };
  }

  /**
   * Delete a variable
   */
  async variableDelete(
    projectId: string,
    environmentId: string,
    name: string,
    serviceId?: string
  ): Promise<{ success: boolean }> {
    const api = this.ensureConfigured();
    const result = await api.deleteVariable(projectId, environmentId, name, serviceId);
    return { success: result };
  }

  /**
   * Bulk set variables
   */
  async variableBulkSet(
    projectId: string,
    environmentId: string,
    variables: Record<string, string>,
    serviceId?: string
  ): Promise<{ success: boolean; count: number }> {
    const api = this.ensureConfigured();
    const result = await api.bulkSetVariables(projectId, environmentId, variables, serviceId);
    return { 
      success: result, 
      count: Object.keys(variables).length 
    };
  }

  /**
   * List deployments for a service
   */
  async deploymentList(serviceId: string, environmentId: string): Promise<any[]> {
    const api = this.ensureConfigured();
    const deployments = await api.listDeployments(serviceId, environmentId);
    
    return deployments.map(deployment => ({
      id: deployment.id,
      status: deployment.status,
      serviceId: deployment.serviceId,
      environmentId: deployment.environmentId,
      createdAt: deployment.createdAt,
      url: deployment.url
    }));
  }

  /**
   * Trigger a new deployment
   */
  async deploymentTrigger(serviceId: string, environmentId: string): Promise<any> {
    const api = this.ensureConfigured();
    const deployment = await api.triggerDeployment(serviceId, environmentId);
    
    return {
      id: deployment.id,
      status: deployment.status,
      serviceId: deployment.serviceId,
      environmentId: deployment.environmentId,
      createdAt: deployment.createdAt,
      url: deployment.url
    };
  }

  /**
   * Get deployment logs
   */
  async deploymentLogs(deploymentId: string): Promise<{ logs: string[] }> {
    const api = this.ensureConfigured();
    const logs = await api.getDeploymentLogs(deploymentId);
    return { logs };
  }

  /**
   * Test Railway API connection
   */
  async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
    if (!this.isConfigured || !this.apiService) {
      return {
        success: false,
        error: 'Railway API not configured'
      };
    }

    return await this.apiService.testConnection();
  }
}