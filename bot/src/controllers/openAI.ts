import { Configuration, OpenAIApi } from 'openai';

import { BotError } from '@/controllers/botError';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

class OpenAIInstanse {
  private openai: OpenAIApi;

  constructor() {
    this.openai = new OpenAIApi(configuration);
  }

  public async chat(message: string) {
    console.log('OpenAI chat:', message);
    return await this.processRequest(message, 'chat');
  }

  public async complete(message: string) {
    console.log('OpenAI complete:', message);
    return await this.processRequest(message, 'completion');
  }

  private async processRequest(message: string, type: 'chat' | 'completion') {
    if (!configuration.apiKey) {
      throw new BotError('OpenAI API key is not configured.');
    }

    if (!message) {
      throw new BotError('What?');
    }

    try {
      if (type === 'chat') {
        const completion = await this.createChat(message);
        return completion.data.choices[0].message.content;
      } else if (type === 'completion') {
        const completion = await this.createCompletion(message);
        return completion.data.choices[0].text;
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

  private async createCompletion(message: string) {
    return await this.openai.createCompletion({
      model: 'text-davinci-003',
      prompt: this.generatePrompt(message),
      max_tokens: 512,
      temperature: 0.6,
    });
  }

  private async createChat(message: string) {
    return await this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      max_tokens: 512,
      temperature: 0.6,
      messages: [
        { role: 'system', content: 'You are Lisa Mincli, helpful witch.' },
        { role: 'user', content: this.generatePrompt(message) },
      ],
    });
  }

  private generatePrompt(message: string) {
    return message;
  }
}

export const OpenAI = new OpenAIInstanse();
