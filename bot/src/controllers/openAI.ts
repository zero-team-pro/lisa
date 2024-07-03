import OpenAIApi, { ClientOptions } from 'openai';
import { ChatCompletionContentPartImage, ChatCompletionMessageParam } from 'openai/resources';

import { BotError } from '@/controllers/botError';
import { BaseMessage, ReplyResult } from '@/controllers/baseMessage';
import { AICall, AIOwner, PaymentTransaction } from '@/models';
import { OpenAiGroupData, Owner } from '@/types';

const configuration: ClientOptions = {
  apiKey: process.env.OPENAI_API_KEY,
};
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

interface Price {
  input: number;
  output: number;
}

class OpenAIInstanse {
  public DEFAULT_BALANCE = 0.01;
  public USAGE_COMMISSION = 0.3;

  public Model = {
    gpt35Turbo: 'gpt-3.5-turbo-0613',
    gpt4Turbo: 'gpt-4-1106-preview',
    gpt4Omni: 'gpt-4o',
    davinci: 'text-davinci-003',
  };

  /** https://openai.com/pricing */
  public Cost: Record<string, Price> = {
    gpt35Turbo: {
      input: 0.0015 / 1000,
      output: 0.002 / 1000,
    },
    gpt4Turbo: {
      input: 0.01 / 1000,
      output: 0.03 / 1000,
    },
    gpt4Omni: {
      input: 0.005 / 1000,
      output: 0.015 / 1000,
    },
    davinci: {
      input: 0.02 / 1000,
      output: 0.02 / 1000,
    },
  };

  private openai: OpenAIApi;

  constructor() {
    this.openai = new OpenAIApi(configuration);
  }

  public async chat(text: string, message: BaseMessage, context?: ChatCompletionMessageParam[]) {
    console.log('OpenAI chat:', text);

    const [aiOwner, owner] = await this.getAIOwner(message);
    const isBalance = await this.ensureBalance(message, aiOwner);
    if (!isBalance) {
      throw BotError.BALANCE_LOW;
    }

    const response = await this.processRequest(text, message, 'chat', context);
    await this.replyAndProcessTransaction(response, message, aiOwner, owner);
    return response;
  }

  public async complete(text: string, message: BaseMessage) {
    console.log('OpenAI complete:', text);

    const [aiOwner, owner] = await this.getAIOwner(message);
    const isBalance = await this.ensureBalance(message, aiOwner);
    if (!isBalance) {
      throw BotError.BALANCE_LOW;
    }

    const response = await this.processRequest(text, message, 'completion');
    await this.replyAndProcessTransaction(response, message, aiOwner, owner);
    return response;
  }

  public async getBalance(message: BaseMessage, aiOwner?: AIOwner): Promise<number> {
    const owner = aiOwner || (await this.getAIOwner(message))[0];

    return owner.balance;
  }

  private async processRequest(
    text: string,
    message: BaseMessage,
    type: 'chat' | 'completion',
    context?: ChatCompletionMessageParam[],
  ): Promise<OpenAIResponse> {
    if (!configuration.apiKey) {
      throw new BotError('OpenAI API key is not configured.');
    }

    if (!text) {
      throw new BotError('What?');
    }

    try {
      if (type === 'chat') {
        const completion = await this.createChat(text, message, context);
        return {
          answer: completion.choices[0].message.content,
          usage: this.countUsage(completion.usage, this.Cost.gpt4Omni),
        };
      } else if (type === 'completion') {
        const completion = await this.createCompletion(text);
        return {
          answer: completion.choices[0].text,
          usage: this.countUsage(completion.usage, this.Cost.davinci),
        };
      } else {
        throw new BotError('OpenAI wrapper usage error');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(
          `OpenAI completion error. Code: ${error.response.status}; Data: ${JSON.stringify(error.response.data)}`,
        );
      } else {
        throw new Error(`OpenAI completion error, ${error}`);
      }
    }
  }

  private countUsage(usage: OpenAIApi.Completions.CompletionUsage, price: Price): OpenAIUsage {
    const spent = usage.prompt_tokens * price.input + usage.completion_tokens * price.output;
    const cost = spent * (1 + this.USAGE_COMMISSION);

    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cost,
    };
  }

  private async createCompletion(text: string) {
    return await this.openai.completions.create({
      model: this.Model.davinci,
      prompt: this.generatePrompt(text),
      max_tokens: 512,
      temperature: 0.6,
    });
  }

  private async createChat(text: string, message: BaseMessage, context: ChatCompletionMessageParam[] = []) {
    const systemMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are Lisa Mincli, helpful witch.' },
    ];
    const promptMessage: ChatCompletionMessageParam = {
      role: 'user',
      content: [{ type: 'text', text: this.generatePrompt(text) }, ...(await this.getImages(message))],
    };

    const messages = [...systemMessages, ...context, promptMessage];

    return await this.openai.chat.completions.create({
      model: this.Model.gpt4Omni,
      // TODO: Customization
      max_tokens: 1024,
      // temperature: 0.6,
      messages,
    });
  }

  private generatePrompt(text: string) {
    return text;
  }

  private async getImages(message: BaseMessage): Promise<
    {
      type: 'image_url';
      image_url: ChatCompletionContentPartImage.ImageURL;
    }[]
  > {
    const images = await message.images;
    return images.map((image) => ({ type: 'image_url', image_url: { url: image, detail: 'auto' } }));
  }

  private async getAIOwner(message: BaseMessage): Promise<[AIOwner, Owner]> {
    const context = await message.getGroupModuleData<OpenAiGroupData>('openai');
    const owner = context?.isGroupPay ? message.getContextOwnerGroup() : message.getContextOwner();

    const [aiOwner] = await AIOwner.findOrCreate({ where: { ...owner }, defaults: { balance: this.DEFAULT_BALANCE } });

    return [aiOwner, owner];
  }

  public async getAIOwnerFromOwner(owner: Owner): Promise<AIOwner | null> {
    const aiOwner = await AIOwner.findOne({ where: { ...owner } });

    return aiOwner;
  }

  public async topUp(owner: Owner, amount: number, method: string): Promise<number | null> {
    let paymentTransaction: PaymentTransaction | null = null;
    try {
      paymentTransaction = await PaymentTransaction.create({ ...owner, amount, method, status: 'SENDING' });
    } catch (err) {
      console.error('Error creating payment transaction: ', err);
      throw new BotError('Error creating payment transaction.');
    }

    if (!paymentTransaction) {
      throw new BotError('Error creating payment transaction.');
    }

    // TODO: PostgreSQL transaction
    try {
      const aiOwner = await this.getAIOwnerFromOwner(owner);

      paymentTransaction.status = 'SENT';
      aiOwner.balance += amount;

      await paymentTransaction.save();
      await aiOwner.save();

      return aiOwner.balance;
    } catch (err) {
      console.error('Error to change balance: ', err);
      throw new BotError('Error topping up balance.');
    }
  }

  public async sendMoney(from: Owner, to: Owner, amount: number): Promise<[number, number] | null> {
    const method = 'TRANSFER';

    let paymentTransactionFrom: PaymentTransaction | null = null;
    let paymentTransactionTo: PaymentTransaction | null = null;
    try {
      // TODO: PostgreSQL transaction
      paymentTransactionFrom = await PaymentTransaction.create({ ...from, amount: -amount, method, status: 'SENDING' });
      paymentTransactionTo = await PaymentTransaction.create({ ...to, amount, method, status: 'SENDING' });
    } catch (err) {
      console.error('Error creating payment transaction: ', err);
      throw new BotError('Error creating payment transaction.');
    }

    if (!paymentTransactionFrom || !paymentTransactionTo) {
      throw new BotError('Error creating payment transaction.');
    }

    // TODO: PostgreSQL transaction
    try {
      const aiOwnerFrom = await this.getAIOwnerFromOwner(from);
      const aiOwnerTo = await this.getAIOwnerFromOwner(to);

      if (aiOwnerFrom.balance < amount) {
        paymentTransactionFrom.status = 'FAILED';
        paymentTransactionTo.status = 'FAILED';

        await paymentTransactionFrom.save();
        await paymentTransactionTo.save();

        throw BotError.BALANCE_LOW;
      }

      paymentTransactionFrom.status = 'SENT';
      paymentTransactionTo.status = 'SENT';
      aiOwnerFrom.balance -= amount;
      aiOwnerTo.balance += amount;

      await paymentTransactionFrom.save();
      await paymentTransactionTo.save();
      await aiOwnerFrom.save();
      await aiOwnerTo.save();

      return [aiOwnerFrom.balance, aiOwnerTo.balance];
    } catch (err) {
      if (err === BotError.BALANCE_LOW) {
        throw err;
      }
      console.error('Error to change balance: ', err);
      throw new BotError('Error topping up balance.');
    }
  }

  private async ensureBalance(message: BaseMessage, aiOwner: AIOwner): Promise<boolean> {
    const balance = await this.getBalance(message, aiOwner);

    return balance > 0;
  }

  private async replyAndProcessTransaction(
    response: OpenAIResponse,
    message: BaseMessage,
    aiOwner: AIOwner,
    owner: Owner,
  ): Promise<void> {
    let replies: ReplyResult[];
    try {
      replies = await message.replyLong(response.answer, true);
    } catch (error) {
      if (error?.response?.error_code !== 400) {
        throw error;
      }
      console.log('Message Markdown noncritical error:', error);
      // Send without markdown
      replies = await message.replyLong(response.answer + '\n\n*MarkdownV2 error', false);
    }

    await AICall.create({ messageId: replies[0].uniqueId, ...owner, ...response.usage });

    await aiOwner.spend(response.usage.cost);
  }
}

export const OpenAI = new OpenAIInstanse();
