import { CopilotRuntime, OpenAIAdapter } from '@copilotkit/runtime';
import { NextRequest } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const MODEL_ID = process.env.BEDROCK_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

// Bedrock adapter for CopilotKit
class BedrockAdapter extends OpenAIAdapter {
  async process(request: any): Promise<any> {
    const messages = request.messages || [];
    const tools = request.tools || [];
    
    // Convert to Bedrock format
    const bedrockMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

    const systemPrompt = `You are a helpful AI assistant with access to tools.
Available tools: ${tools.map((t: any) => t.function.name).join(', ')}.

When the user asks about weather, profiles, or charts, use the appropriate tool.`;

    const bedrockRequest = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      messages: bedrockMessages,
      system: systemPrompt,
      ...(tools.length > 0 && {
        tools: tools.map((tool: any) => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters,
        })),
      }),
    };

    try {
      const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(bedrockRequest),
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Convert Bedrock response to OpenAI format for CopilotKit
      const content = responseBody.content[0];
      
      if (content.type === 'tool_use') {
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: content.id,
                type: 'function',
                function: {
                  name: content.name,
                  arguments: JSON.stringify(content.input),
                },
              }],
            },
            finish_reason: 'tool_calls',
          }],
        };
      }

      return {
        choices: [{
          message: {
            role: 'assistant',
            content: content.text || '',
          },
          finish_reason: 'stop',
        }],
      };
    } catch (error) {
      console.error('Bedrock error:', error);
      throw error;
    }
  }
}

export async function POST(req: NextRequest) {
  const runtime = new CopilotRuntime();
  const bedrockAdapter = new BedrockAdapter();

  return runtime.response(req, bedrockAdapter);
}
