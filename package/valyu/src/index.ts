// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Validation schemas for the API endpoints
const KnowledgeRequestSchema = z.object({
  query: z.string(),
  search_type: z.enum(["proprietary", "web", "all"]),
  max_price: z.number(),
  data_sources: z.array(z.string()).optional(),
  max_num_results: z.number().int().positive().default(10),
  similarity_threshold: z.number().min(0).max(1).default(0.4),
  query_rewrite: z.boolean().default(true)
});

const FeedbackRequestSchema = z.object({
  tx_id: z.string(),
  feedback: z.string(),
  sentiment: z.enum(["very good", "good", "bad", "very bad"])
});

// Define request types based on schemas
type KnowledgeRequest = z.infer<typeof KnowledgeRequestSchema>;
type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

// API client class to handle requests
class ValyuAPI {
  private baseUrl = 'https://api.valyu.network';
  private apiKey: string;

  constructor() {
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      throw new Error('VALYU_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST', data?: unknown) {
    const headers = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers,
			body: JSON.stringify(data)
    };

    let url = this.baseUrl + endpoint;
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async knowledge(params: KnowledgeRequest) {
    return this.makeRequest('/v1/knowledge', 'POST', params);
  }

  async feedback(params: FeedbackRequest) {
    return this.makeRequest('/v1/feedback', 'POST', params);
  }
}

// Define tools
const TOOLS: Record<string, Tool> = {
  knowledge: {
    name: "knowledge",
    description: "Search proprietary and/or web sources for information based on the supplied query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        search_type: { type: "string", enum: ["proprietary", "web", "all"] },
        max_price: { type: "number" },
        data_sources: { type: "array", items: { type: "string" } },
        max_num_results: { type: "integer", default: 10 },
        similarity_threshold: { type: "number", default: 0.4 },
        query_rewrite: { type: "boolean", default: true }
      },
      required: ["query", "search_type", "max_price"]
    },
  },
  feedback: {
    name: "feedback",
    description: "Submit user feedback and sentiment for a transaction.",
    inputSchema: {
      type: "object",
      properties: {
        tx_id: { type: "string" },
        feedback: { type: "string" },
        sentiment: { type: "string", enum: ["very good", "good", "bad", "very bad"] }
      },
      required: ["tx_id", "feedback", "sentiment"]
    },
  }
};

// Create and configure the MCP server
async function main() {
  const api = new ValyuAPI();

  const server = new Server(
    {
      name: "valyu-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(TOOLS),
  }));

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const args = request.params.arguments as Record<string, unknown>;
      
      switch (request.params.name) {
        case "knowledge": {
          const validatedArgs = KnowledgeRequestSchema.parse(args);
          const result = await api.knowledge(validatedArgs);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result)
            }]
          };
        }
        case "feedback": {
          const validatedArgs = FeedbackRequestSchema.parse(args);
          const result = await api.feedback(validatedArgs);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result)
            }]
          };
        }
        default:
          return {
            content: [{
              type: "text",
              text: `Unknown tool: ${request.params.name}`
            }],
            isError: true
          };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to start server:", error.message);
    } else {
      console.error("Failed to start server with unknown error");
    }
    process.exit(1);
  }
}

main();
