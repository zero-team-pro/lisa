import { ChatCompletionRequestMessage, Configuration, CreateCompletionResponseUsage, OpenAIApi } from 'openai';

import { BotError } from '@/controllers/botError';
import { BaseMessage } from '@/controllers/baseMessage';
import { AICall, AIOwner } from '@/models';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OpenAIResponse {
  answer: string;
  usage: OpenAIUsage;
}

export interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

class OpenAIInstanse {
  public DEFAULT_BALANCE = 0.01;
  /** https://openai.com/pricing */
  public Cost = { gpt35Turbo: 0.002 / 1000, davinci: 0.02 / 1000 };

  private openai: OpenAIApi;

  constructor() {
    this.openai = new OpenAIApi(configuration);
  }

  public async chat(text: string, message: BaseMessage, context?: ChatCompletionRequestMessage[]) {
    console.log('OpenAI chat:', text);

    const isBalance = await this.ensureBalance(message);
    if (!isBalance) {
      throw new BotError('Your account balance is empty');
    }

    const response = await this.processRequest(text, 'chat', context);
    await this.replyAndProcessTransaction(response, message);
    return response;
  }

  public async complete(text: string, message: BaseMessage) {
    console.log('OpenAI complete:', text);

    const isBalance = await this.ensureBalance(message);
    if (!isBalance) {
      throw new BotError('Your account balance is empty');
    }

    const response = await this.processRequest(text, 'completion');
    await this.replyAndProcessTransaction(response, message);
    return response;
  }

  public async getBalance(message: BaseMessage): Promise<number> {
    const aiOwner = await this.getAIOwner(message);

    return aiOwner.balance;
  }

  private async processRequest(
    text: string,
    type: 'chat' | 'completion',
    context?: ChatCompletionRequestMessage[],
  ): Promise<OpenAIResponse> {
    if (!configuration.apiKey) {
      throw new BotError('OpenAI API key is not configured.');
    }

    if (!text) {
      throw new BotError('What?');
    }

    try {
      if (type === 'chat') {
        const completion = await this.createChat(text, context);
        return {
          answer: completion.data.choices[0].message.content,
          usage: this.countUsage(completion.data.usage, this.Cost.gpt35Turbo),
        };
      } else if (type === 'completion') {
        const completion = await this.createCompletion(text);
        return {
          answer: completion.data.choices[0].text,
          usage: this.countUsage(completion.data.usage, this.Cost.davinci),
        };
      } else {
        throw new BotError('OpenAI wrapper usage error');
      }
    } catch (error) {
      if (error.response) {
        new Error(
          `OpenAI completion error. Code: ${error.response.status}; Data: ${JSON.stringify(error.response.data)}`,
        );
      } else {
        new Error(`OpenAI completion error.`);
      }
    }
  }

  private countUsage(usage: CreateCompletionResponseUsage, price: number): OpenAIUsage {
    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cost: usage.total_tokens * price,
    };
  }

  private async createCompletion(text: string) {
    return await this.openai.createCompletion({
      model: 'text-davinci-003',
      prompt: this.generatePrompt(text),
      max_tokens: 512,
      temperature: 0.6,
    });
  }

  private async createChat(text: string, context: ChatCompletionRequestMessage[] = []) {
    const systemMessages: ChatCompletionRequestMessage[] = [
      { role: 'system', content: 'You are Lisa Mincli, helpful witch.' },
    ];
    const promptMessage: ChatCompletionRequestMessage = { role: 'user', content: this.generatePrompt(text) };

    const messages = [...systemMessages, ...context, promptMessage];

    return await this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      max_tokens: 512,
      temperature: 0.6,
      messages,
    });
  }

  private generatePrompt(text: string) {
    return text;
  }

  private async getAIOwner(message): Promise<AIOwner> {
    const owner = message.getContextOwner();
    const [aiOwner] = await AIOwner.findOrCreate({ where: { ...owner }, defaults: { balance: this.DEFAULT_BALANCE } });

    return aiOwner;
  }

  private async ensureBalance(message: BaseMessage): Promise<boolean> {
    const balance = await this.getBalance(message);

    return balance > 0;
  }

  private async replyAndProcessTransaction(response: OpenAIResponse, message: BaseMessage): Promise<void> {
    const { uniqueId } = await message.reply(response.answer);

    const owner = message.getContextOwner();

    await AICall.create({ messageId: uniqueId, ...owner, ...response.usage });

    const aiOwner = await this.getAIOwner(message);

    await aiOwner.spend(response.usage.cost);
  }
}

export const OpenAI = new OpenAIInstanse();
