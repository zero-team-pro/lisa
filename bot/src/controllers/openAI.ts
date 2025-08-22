import { getEncoding, Tiktoken } from 'js-tiktoken';
import OpenAIApi, { ClientOptions } from 'openai';
import {
  ChatCompletion,
  ChatCompletionContentPartImage,
  ChatCompletionFunctionTool,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
  FunctionParameters,
  ImageGenerateParams,
} from 'openai/resources';
import pMap from 'p-map';

import { BaseMessage, ReplyResult } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';
import { Logger } from '@/controllers/logger';
import { AICall, AIOwner, PaymentTransaction } from '@/models';
import { CommandMap, OpenAIAbility, OpenAiGroupData, Owner, Transport } from '@/types';

const configuration: ClientOptions = {
  apiKey: process.env.OPENAI_API_KEY,
};
export interface OpenAIResponse {
  answer?: string;
  refusal?: string;
  imageUrl?: string;
  usage: OpenAIUsage;
}

type Models = OpenAIInstanse['Model'] & OpenAIInstanse['ModelImage'];

type ModelValues = Models[keyof Models];

export interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  model: ModelValues;
}

interface Price {
  input: number;
  output: number;
}

interface ToolSummary {
  name: string;
  description: string;
}

const M = 1000 * 1000;

const SYS_MESSAGE = `
You are Lisa Mincli, helpful witch.
Output must be valid Markdown. Use Markdown to **improve the readability** of your responses.
`;

const SYS_MESSAGE_TOOL_ROUTER = `
You are a tool router. Input: a list of tools with brief descriptions and the user’s request.
Task:

• Choose the minimal set of tools that are actually needed for the request.

• If the request can be answered without tools, say so.

Answer format — STRICTLY JSON: {"tools": string[]}, where "tools" is the list of "name" values from the provided tools.
`;

class OpenAIInstanse {
  public DEFAULT_BALANCE = 0.01;
  public USAGE_COMMISSION = 0.3;

  public readonly Model = {
    gpt5: 'gpt-5',
    gpt5Mini: 'gpt-5-mini',
    gpt5Nano: 'gpt-5-nano',
    gpt41: 'gpt-4.1',
    gpt4Omni: 'gpt-4o',
    gpt4Omni2: 'gpt-4o-2024-08-06',
    gpt4Turbo: 'gpt-4-1106-preview',
    gpt35Turbo: 'gpt-3.5-turbo-0613',
    davinci: 'text-davinci-003',
  } as const;

  public readonly ModelImage = {
    dallE2: 'dall-e-2',
    dallE3: 'dall-e-3',
  } as const;

  /** https://platform.openai.com/docs/models */
  public Cost: Record<string, Price> = {
    [this.Model['gpt5']]: {
      input: 1.25 / M,
      output: 10 / M,
    },
    [this.Model['gpt5Mini']]: {
      input: 0.25 / M,
      output: 2 / M,
    },
    [this.Model['gpt5Nano']]: {
      input: 0.05 / M,
      output: 0.4 / M,
    },
    [this.Model['gpt41']]: {
      input: 2 / M,
      output: 8 / M,
    },
    [this.Model['gpt4Omni']]: {
      input: 5 / M,
      output: 15 / M,
    },
    [this.Model['gpt4Omni2']]: {
      input: 2.5 / M,
      output: 10 / M,
    },
    [this.Model['gpt4Turbo']]: {
      input: 10 / M,
      output: 30 / M,
    },
    [this.Model['gpt35Turbo']]: {
      input: 1.5 / M,
      output: 2 / M,
    },
    [this.Model['davinci']]: {
      input: 20 / M,
      output: 20 / M,
    },
    [this.ModelImage['dallE2']]: {
      input: 0,
      output: 0.02,
    },
    [this.ModelImage['dallE3']]: {
      input: 0,
      output: 0.04,
    },
  };

  /** https://github.com/dqbd/tiktoken/blob/main/tiktoken/model_to_encoding.json */
  public Encoders: Record<string, Tiktoken> = {
    [this.Model.gpt5]: getEncoding('o200k_base'),
    [this.Model.gpt5Mini]: getEncoding('o200k_base'),
    [this.Model.gpt5Nano]: getEncoding('o200k_base'),
    [this.Model.gpt41]: getEncoding('o200k_base'),
    [this.Model.gpt4Omni]: getEncoding('o200k_base'),
    [this.Model.gpt4Omni2]: getEncoding('o200k_base'),
    [this.Model.gpt4Turbo]: getEncoding('cl100k_base'),
    [this.Model.gpt35Turbo]: getEncoding('cl100k_base'),
    [this.Model.davinci]: getEncoding('cl100k_base'),
  };

  private openai: OpenAIApi;
  private commandMap: Record<string, OpenAIAbility>;
  private tools: ChatCompletionFunctionTool[];
  private toolSummaries: ToolSummary[] = [];

  constructor() {}

  public init() {
    this.openai = new OpenAIApi(configuration);
  }

  public initTools(globalCommandList: CommandMap<any>[]): ChatCompletionFunctionTool[] {
    this.commandMap = {};

    const commandList = globalCommandList.filter(
      (command) => command.transports.includes(Transport.OpenAI) && Boolean(command.tool),
    );
    const tools: ChatCompletionFunctionTool[] = commandList.map((command): ChatCompletionFunctionTool => {
      this.commandMap[command.title] = command.tool;

      return {
        type: 'function',
        function: {
          strict: true,
          name: command.title,
          description: command.description,
          parameters: command.parameters as FunctionParameters,
        },
      };
    });

    Logger.info('OpenAI tools INIT', Object.keys(this.commandMap), 'OpenAI');

    this.tools = tools;

    this.toolSummaries = Object.values(tools).map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
    }));

    return tools;
  }

  public async chat(
    text: string,
    message: BaseMessage,
    aiOwner: AIOwner,
    owner: Owner,
    isToolsUse: boolean = false,
    isFileAnswer: boolean = false,
    historyContext: ChatCompletionMessageParam[] = [],
  ) {
    Logger.info('OpenAI chat', text, 'OpenAI');

    const isBalance = await this.ensureBalance(message, aiOwner);
    if (!isBalance) {
      throw BotError.BALANCE_LOW;
    }

    const response = await this.processRequest(
      text,
      message,
      'chat',
      isToolsUse,
      isFileAnswer,
      historyContext,
      aiOwner,
      owner,
    );
    await this.replyAndProcessTransaction(response, message, aiOwner, owner, isFileAnswer);
    return response;
  }

  public async getBalance(message: BaseMessage, aiOwner?: AIOwner): Promise<number> {
    const owner = aiOwner || (await this.getAIOwner(message))[0];

    return owner.balance;
  }

  public async image(
    text: string,
    message: BaseMessage,
    isToolsUse: boolean = false,
    context: ChatCompletionMessageParam[] = [],
  ) {
    Logger.info('OpenAI image', text, 'OpenAI');

    const [aiOwner, owner] = await this.getAIOwner(message);
    const isBalance = await this.ensureBalance(message, aiOwner);
    if (!isBalance) {
      throw BotError.BALANCE_LOW;
    }

    const response = await this.processRequest(text, message, 'image', isToolsUse, true, context, aiOwner, owner);
    await this.replyAndProcessTransaction(response, message, aiOwner, owner, true);
    return response;
  }

  private async routeTools(
    userText: string,
    message: BaseMessage,
    aiOwner?: AIOwner,
    owner?: Owner,
  ): Promise<ChatCompletionTool[]> {
    const msg: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYS_MESSAGE_TOOL_ROUTER },
      {
        role: 'user',
        content: `${JSON.stringify(this.toolSummaries)}\n\n=====\n\nRequest: ${userText}`,
      },
    ];

    const model = this.Model.gpt5Nano;
    const response = await this.openai.chat.completions.create({
      model,
      messages: msg,
      // GPT-5-Nano supports only temperature 1
      temperature: 1,
      response_format: { type: 'json_object' },
      max_completion_tokens: 1000,
    });

    const usage = this.countUsage(response.usage, model, response.model);
    const toolsTokens = usage.totalTokens;

    await AICall.create({ messageId: message.uniqueId, ...owner, ...usage, model, toolsTokens });
    await aiOwner.spend(usage.cost);

    // TODO: Prometheus metrics
    try {
      const plan = JSON.parse(response.choices[0].message.content);
      const toolsToUse = this.tools.filter((tool) => plan.tools.includes(tool.function.name));
      return toolsToUse;
    } catch (_e) {
      return [];
    }
  }

  private async processRequest(
    text: string,
    message: BaseMessage,
    type: 'chat' | 'image',
    isToolsUse: boolean = false,
    isFileAnswer: boolean = false,
    historyContext: ChatCompletionMessageParam[] = [],
    aiOwner?: AIOwner,
    owner?: Owner,
  ): Promise<OpenAIResponse> {
    if (!configuration.apiKey) {
      throw new BotError('OpenAI API key is not configured.');
    }

    if (!text) {
      throw new BotError('What?');
    }

    try {
      if (type === 'chat') {
        const tools = isToolsUse ? await this.routeTools(text, message, aiOwner, owner) : null;

        Logger.info(
          'OpenAI tools',
          tools.map((tool) => (tool.type === 'function' ? tool.function.name : '_custom_')),
          'OpenAI',
        );

        const model = this.getOwnerModel(aiOwner);
        const context = await this.createContext(text, message, historyContext);

        let completion = await this.createChat(context, tools, isFileAnswer, aiOwner, model);

        context.push(completion.choices[0].message);
        let maxCalls = 10;

        while (maxCalls > 0) {
          maxCalls--;

          if (
            completion.choices[0].finish_reason === 'tool_calls' ||
            completion.choices[0].finish_reason === 'function_call'
          ) {
            completion = await this.processTools(tools, message, completion, context, aiOwner, owner, model);
          } else {
            return {
              answer: completion.choices[0].message.content,
              refusal: completion.choices[0].message.refusal,
              usage: this.countUsage(completion.usage, model, completion.model),
            };
          }
        }
      }
      if (type === 'image') {
        const image = await this.generateImage(text);

        return {
          imageUrl: image.data[0].url,
          usage: image.usage,
        };
      } else {
        throw new BotError('OpenAI wrapper usage error');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`OpenAI error. Code: ${error.response.status}; Data: ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`OpenAI error, ${error}`);
      }
    }
  }

  private async processTools(
    tools: ChatCompletionTool[],
    message: BaseMessage,
    completion: ChatCompletion,
    context: ChatCompletionMessageParam[] = [],
    aiOwner: AIOwner,
    owner: Owner,
    model: ModelValues,
  ): Promise<ChatCompletion> {
    if (aiOwner && owner) {
      const usage = this.countUsage(completion.usage, model, completion.model);
      const toolsTokens = this.Encoders[model].encode(JSON.stringify(this.tools)).length;

      await AICall.create({ messageId: message.uniqueId, ...owner, ...usage, model, toolsTokens });
      await aiOwner.spend(usage.cost);
    }

    const toolCalls = completion.choices[0].message.tool_calls;

    let toolResultList: ChatCompletionToolMessageParam[] = [];
    try {
      toolResultList = await pMap(toolCalls, async (call): Promise<ChatCompletionToolMessageParam> => {
        if (!('function' in call)) {
          throw new BotError('Invalid tool call type');
        }

        const tool = this.commandMap[call.function.name];
        const params = JSON.parse(call.function.arguments);
        const toolResult = await tool(aiOwner, params);

        return {
          tool_call_id: call.id,
          role: 'tool',
          content: toolResult,
        };
      });
    } catch (error) {
      throw new BotError('OpenAI Tools (Actions) processing error');
    }

    context.push(...toolResultList);

    const toolsCompletion = await this.createChat([...context], tools, false, aiOwner, model);

    context.push(toolsCompletion.choices[0].message);

    return toolsCompletion;
  }

  private countUsage(usage: OpenAIApi.Completions.CompletionUsage, model: ModelValues, rawModel: string): OpenAIUsage {
    const price = this.Cost[model];
    const spent = usage.prompt_tokens * price.input + usage.completion_tokens * price.output;
    const cost = spent * (1 + this.USAGE_COMMISSION);

    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cost,
      model: model,
    };
  }

  private async createContext(
    text?: string,
    message?: BaseMessage,
    history: ChatCompletionMessageParam[] = [],
  ): Promise<ChatCompletionMessageParam[]> {
    const systemMessages: ChatCompletionMessageParam[] = [{ role: 'system', content: SYS_MESSAGE }];
    const promptMessage: ChatCompletionMessageParam | null = {
      role: 'user',
      content: [{ type: 'text', text: this.generatePrompt(text) }, ...(await this.getImages(message))],
    };

    const context = [...systemMessages, ...history, promptMessage].filter(Boolean);

    return context;
  }

  private async createChat(
    context: ChatCompletionMessageParam[] = [],
    tools: ChatCompletionTool[] | null = null,
    isFileAnswer: boolean = false,
    aiOwner: AIOwner,
    model: ModelValues,
  ) {
    const messages = [...context].filter(Boolean);

    return await this.openai.chat.completions.create({
      model,
      // TODO: Customization
      max_completion_tokens: isFileAnswer ? Math.max(12_800, aiOwner.maxTokens || 10_000) : aiOwner.maxTokens || 10_000,
      // temperature: 0.6,
      messages,
      tools: tools || undefined,
    });
  }

  private async generateImage(
    text: string,
    model: ImageGenerateParams['model'] = this.ModelImage.dallE3,
    quality: ImageGenerateParams['quality'] = 'standard',
    size: ImageGenerateParams['size'] = '1024x1024',
  ) {
    const image = await this.openai.images.generate({
      model,
      quality,
      size,
      prompt: text,
    });

    return { ...image, usage: this.getImageUsage({ model, quality, size, n: 1 }) };
  }

  private getImageUsage(params: Pick<ImageGenerateParams, 'model' | 'quality' | 'size' | 'n'>): OpenAIUsage {
    const price = this.Cost[params.model];
    const spent = params.n * price.output;
    const cost = spent * (1 + this.USAGE_COMMISSION);

    return {
      promptTokens: 0,
      completionTokens: params.n,
      totalTokens: params.n,
      model: params.model as ModelValues,
      cost,
    };
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

  public async getAIOwner(message: BaseMessage): Promise<[AIOwner, Owner]> {
    const context = await message.getGroupModuleData<OpenAiGroupData>('openai');
    const owner = context?.isGroupPay ? message.getContextOwnerGroup() : message.getContextOwner();

    const [aiOwner] = await AIOwner.findOrCreate({ where: { ...owner }, defaults: { balance: this.DEFAULT_BALANCE } });

    return [aiOwner, owner];
  }

  private getOwnerModel(aiOwner: AIOwner): ModelValues {
    if (aiOwner.model === null) {
      return this.Model.gpt5;
    }

    if (Object.values(this['Model']).includes(aiOwner.model as any)) {
      return aiOwner.model as ModelValues;
    }

    Logger.warn('getOwnerModel fall to default value', null, 'OpenAI');

    return this.Model.gpt5;
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
      Logger.error('Error creating payment transaction', err, 'OpenAI');
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
      Logger.error('Error to change balance', err, 'OpenAI');
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
      Logger.error('Error creating payment transaction', err, 'OpenAI');
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
      Logger.error('Error to change balance', err, 'OpenAI');
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
    isFileAnswer: boolean,
  ): Promise<void> {
    let replies: ReplyResult[];

    if (isFileAnswer) {
      try {
        if (response.imageUrl) {
          replies = [await message.replyWithImage('image.png', response.imageUrl)];
        } else {
          replies = [await message.replyWithDocument('reply.md', response.answer)];
        }
      } catch (error) {
        Logger.warn('Message file error', error, 'OpenAI');
        throw error;
      }
    } else {
      try {
        replies = await message.replyLong(response.answer, true);
      } catch (error) {
        if (error?.response?.error_code !== 400) {
          throw error;
        }
        Logger.warn('Message Markdown noncritical error', error, 'OpenAI');
        Logger.info('Message answer', response.answer, 'OpenAI');
        Logger.info('Message refusal', response.refusal, 'OpenAI');
        // Send without markdown
        replies = await message.replyLong(response.answer + '\n\n*MarkdownV2 error', false);
      }
    }

    await AICall.create({ messageId: replies[0].uniqueId, ...owner, ...response.usage });
    await aiOwner.spend(response.usage.cost);
  }
}

export const OpenAI = new OpenAIInstanse();
