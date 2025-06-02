/**
 * Railway API Service - GraphQL client for Railway.app integration
 * 
 * Provides core functionality to replace non-functional MCP Railway tools:
 * - Project management (list, info, create, delete)
 * - Service management (list, info, create, update, restart)
 * - Variable management (list, set, delete, bulk operations)
 * - Deployment management (list, trigger, logs, status)
 * - Environment management (list, create, delete)
 */

interface RailwayConfig {
  apiToken: string;
  endpoint?: string;
}

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
}

interface RailwayProject {
  id: string;
  name: string;
  description?: string;
  teamId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RailwayService {
  id: string;
  name: string;
  projectId: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

interface RailwayEnvironment {
  id: string;
  name: string;
  projectId: string;
  isEphemeral: boolean;
  createdAt: string;
}

interface RailwayDeployment {
  id: string;
  status: string;
  serviceId: string;
  environmentId: string;
  createdAt: string;
  url?: string;
}

// Removed unused interface

export class RailwayAPIService {
  private config: RailwayConfig;
  private endpoint: string;

  constructor(config: RailwayConfig) {
    this.config = config;
    this.endpoint = config.endpoint || 'https://backboard.railway.com/graphql/v2';
  }

  /**
   * Execute GraphQL query/mutation against Railway API
   */
  private async executeGraphQL<T = any>(
    query: string, 
    variables: Record<string, any> = {}
  ): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiToken}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Railway API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as GraphQLResponse<T>;

    if (result.errors && result.errors.length > 0) {
      const errorMessage = result.errors.map(err => err.message).join(', ');
      throw new Error(`Railway API error: ${errorMessage}`);
    }

    if (!result.data) {
      throw new Error('Railway API returned no data');
    }

    return result.data;
  }

  // ============================================================================
  // PROJECT MANAGEMENT
  // ============================================================================

  /**
   * List all projects in the account
   */
  async listProjects(): Promise<RailwayProject[]> {
    const query = `
      query {
        me {
          projects {
            edges {
              node {
                id
                name
                description
                teamId
                isPublic
                createdAt
                updatedAt
              }
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQL(query);
    return data.me.projects.edges.map((edge: any) => edge.node);
  }

  /**
   * Get detailed project information
   */
  async getProjectInfo(projectId: string): Promise<RailwayProject & { 
    services: RailwayService[]; 
    environments: RailwayEnvironment[] 
  }> {
    const query = `
      query($projectId: String!) {
        project(id: $projectId) {
          id
          name
          description
          teamId
          isPublic
          createdAt
          updatedAt
          services {
            edges {
              node {
                id
                name
                icon
                createdAt
                updatedAt
              }
            }
          }
          environments {
            edges {
              node {
                id
                name
                isEphemeral
                createdAt
              }
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQL(query, { projectId });
    const project = data.project;
    
    return {
      ...project,
      projectId: project.id,
      services: project.services.edges.map((edge: any) => ({ 
        ...edge.node, 
        projectId: project.id 
      })),
      environments: project.environments.edges.map((edge: any) => ({ 
        ...edge.node, 
        projectId: project.id 
      })),
    };
  }

  /**
   * Create a new project
   */
  async createProject(name: string, teamId?: string): Promise<RailwayProject> {
    const query = `
      mutation($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          id
          name
          description
          teamId
          isPublic
          createdAt
          updatedAt
        }
      }
    `;

    const input: any = { name };
    if (teamId) {
      input.teamId = teamId;
    }

    const data = await this.executeGraphQL(query, { input });
    return data.projectCreate;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<boolean> {
    const query = `
      mutation($projectId: String!) {
        projectDelete(id: $projectId)
      }
    `;

    const data = await this.executeGraphQL(query, { projectId });
    return data.projectDelete;
  }

  // ============================================================================
  // SERVICE MANAGEMENT
  // ============================================================================

  /**
   * List services in a project
   */
  async listServices(projectId: string): Promise<RailwayService[]> {
    const query = `
      query($projectId: String!) {
        project(id: $projectId) {
          services {
            edges {
              node {
                id
                name
                icon
                createdAt
                updatedAt
              }
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQL(query, { projectId });
    return data.project.services.edges.map((edge: any) => ({ 
      ...edge.node, 
      projectId 
    }));
  }

  /**
   * Get detailed service information
   */
  async getServiceInfo(serviceId: string): Promise<RailwayService & { deployments: RailwayDeployment[] }> {
    const query = `
      query($serviceId: String!) {
        service(id: $serviceId) {
          id
          name
          icon
          createdAt
          updatedAt
          project {
            id
          }
          deployments {
            edges {
              node {
                id
                status
                createdAt
                url
                environment {
                  id
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQL(query, { serviceId });
    const service = data.service;
    
    return {
      ...service,
      projectId: service.project.id,
      deployments: service.deployments.edges.map((edge: any) => ({
        ...edge.node,
        serviceId: service.id,
        environmentId: edge.node.environment.id,
      })),
    };
  }

  /**
   * Create service from GitHub repository
   */
  async createServiceFromRepo(
    projectId: string, 
    environmentId: string,
    repoFullName: string,
    name?: string
  ): Promise<RailwayService> {
    const query = `
      mutation($input: ServiceCreateInput!) {
        serviceCreate(input: $input) {
          id
          name
          icon
          createdAt
          updatedAt
        }
      }
    `;

    const input = {
      projectId,
      environmentId,
      source: {
        repo: repoFullName
      },
      name: name || repoFullName.split('/').pop()
    };

    const data = await this.executeGraphQL(query, { input });
    return { ...data.serviceCreate, projectId };
  }

  /**
   * Create service from Docker image
   */
  async createServiceFromImage(
    projectId: string, 
    environmentId: string,
    image: string,
    name?: string
  ): Promise<RailwayService> {
    const query = `
      mutation($input: ServiceCreateInput!) {
        serviceCreate(input: $input) {
          id
          name
          icon
          createdAt
          updatedAt
        }
      }
    `;

    const input = {
      projectId,
      environmentId,
      source: {
        image
      },
      name: name || image.split('/').pop()?.split(':')[0]
    };

    const data = await this.executeGraphQL(query, { input });
    return { ...data.serviceCreate, projectId };
  }

  // ============================================================================
  // VARIABLE MANAGEMENT
  // ============================================================================

  /**
   * List variables for a service or environment
   */
  async listVariables(
    projectId: string, 
    environmentId: string, 
    serviceId?: string
  ): Promise<Record<string, string>> {
    const query = `
      query($projectId: String!, $environmentId: String!, $serviceId: String) {
        variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
      }
    `;

    const data = await this.executeGraphQL(query, { projectId, environmentId, serviceId });
    return data.variables || {};
  }

  /**
   * Set/update a variable
   */
  async setVariable(
    projectId: string,
    environmentId: string,
    name: string,
    value: string,
    serviceId?: string
  ): Promise<boolean> {
    const query = `
      mutation($input: VariableUpsertInput!) {
        variableUpsert(input: $input)
      }
    `;

    const input: any = {
      projectId,
      environmentId,
      name,
      value
    };

    if (serviceId) {
      input.serviceId = serviceId;
    }

    const data = await this.executeGraphQL(query, { input });
    return data.variableUpsert;
  }

  /**
   * Delete a variable
   */
  async deleteVariable(
    projectId: string,
    environmentId: string,
    name: string,
    serviceId?: string
  ): Promise<boolean> {
    const query = `
      mutation($input: VariableDeleteInput!) {
        variableDelete(input: $input)
      }
    `;

    const input: any = {
      projectId,
      environmentId,
      name
    };

    if (serviceId) {
      input.serviceId = serviceId;
    }

    const data = await this.executeGraphQL(query, { input });
    return data.variableDelete;
  }

  /**
   * Bulk set variables
   */
  async bulkSetVariables(
    projectId: string,
    environmentId: string,
    variables: Record<string, string>,
    serviceId?: string
  ): Promise<boolean> {
    const promises = Object.entries(variables).map(([name, value]) =>
      this.setVariable(projectId, environmentId, name, value, serviceId)
    );

    const results = await Promise.all(promises);
    return results.every(result => result);
  }

  // ============================================================================
  // DEPLOYMENT MANAGEMENT
  // ============================================================================

  /**
   * List deployments for a service
   */
  async listDeployments(serviceId: string, environmentId: string): Promise<RailwayDeployment[]> {
    const query = `
      query($serviceId: String!, $environmentId: String!) {
        deployments(serviceId: $serviceId, environmentId: $environmentId) {
          edges {
            node {
              id
              status
              createdAt
              url
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQL(query, { serviceId, environmentId });
    return data.deployments.edges.map((edge: any) => ({
      ...edge.node,
      serviceId,
      environmentId,
    }));
  }

  /**
   * Trigger a new deployment
   */
  async triggerDeployment(serviceId: string, environmentId: string): Promise<RailwayDeployment> {
    const query = `
      mutation($input: ServiceDeployInput!) {
        serviceDeploy(input: $input) {
          id
          status
          createdAt
          url
        }
      }
    `;

    const input = {
      serviceId,
      environmentId
    };

    const data = await this.executeGraphQL(query, { input });
    return {
      ...data.serviceDeploy,
      serviceId,
      environmentId,
    };
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    const query = `
      query($deploymentId: String!) {
        deploymentLogs(deploymentId: $deploymentId) {
          message
          timestamp
        }
      }
    `;

    const data = await this.executeGraphQL(query, { deploymentId });
    return data.deploymentLogs.map((log: any) => `[${log.timestamp}] ${log.message}`);
  }

  // ============================================================================
  // ENVIRONMENT MANAGEMENT
  // ============================================================================

  /**
   * List environments in a project
   */
  async listEnvironments(projectId: string): Promise<RailwayEnvironment[]> {
    const query = `
      query($projectId: String!) {
        project(id: $projectId) {
          environments {
            edges {
              node {
                id
                name
                isEphemeral
                createdAt
              }
            }
          }
        }
      }
    `;

    const data = await this.executeGraphQL(query, { projectId });
    return data.project.environments.edges.map((edge: any) => ({ 
      ...edge.node, 
      projectId 
    }));
  }

  /**
   * Test API connection and authentication
   */
  async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const query = `
        query {
          me {
            id
            name
            email
          }
        }
      `;

      const data = await this.executeGraphQL(query);
      return {
        success: true,
        user: data.me
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}