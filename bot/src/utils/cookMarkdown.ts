import {
  BlockContent,
  BlockContentMap,
  Break,
  Code,
  DefinitionContent,
  DefinitionContentMap,
  Delete,
  Emphasis,
  Heading,
  InlineCode,
  Link,
  List,
  ListItem,
  Node,
  Paragraph,
  PhrasingContent,
  PhrasingContentMap,
  Root,
  RootContent,
  RootContentMap,
  Strong,
  Text,
  ThematicBreak,
  Yaml,
} from 'mdast';
import markdown from 'remark-parse';
import { unified } from 'unified';

import { escapeCharacters } from './escapeCharacters';
import _ from 'lodash';

type FlowContent = BlockContent | DefinitionContent;
type FlowContentMap = BlockContentMap & DefinitionContentMap;

const processUnknown = (_node: Node): string => {
  return 'undefinedProcessor';
};

const processBreak = (_node: Break): string => {
  return '\n';
};

const processCode = (node: Code): string => {
  return '\n```' + (node.lang ?? '') + '\n' + node.value + '\n```\n\n';
};

const processDelete = (node: Delete): string => {
  return '~' + processPhrasingContent(node.children) + '~';
};

const processEmphasis = (node: Emphasis): string => {
  return '_' + processPhrasingContent(node.children) + '_';
};

const processHeading = (node: Heading): string => {
  // Ignoring node.depth
  return '\n*' + processPhrasingContent(node.children) + '*\n';
};

const processLink = (node: Link): string => {
  const text = processPhrasingContent(node.children);
  return `[${text}](${node.url})`;
};

const processList = (node: List): string[] => {
  const listItemsRaw = node.children.map((child) => processListItem(child));
  const listItems = _.flatMap(listItemsRaw, (item, idx) => (idx < listItemsRaw.length - 1 ? [item, '\n'] : [item]));

  return ['\n', ...listItems, '\n'];
};

const processFlowContent = (node: FlowContent[]): string[] => {
  const typeToProcessor: { [key in FlowContent['type']]: (child: FlowContentMap[key]) => string | string[] } = {
    blockquote: processUnknown, // TODO
    code: processCode,
    definition: processUnknown, // TODO
    footnoteDefinition: processUnknown, // TODO
    heading: processHeading,
    html: processUnknown, // TODO
    list: processList,
    paragraph: processParagraph,
    table: processUnknown, // TODO
    thematicBreak: processThematicBreak,
  };

  const list = node
    .map((child) => {
      const processor = typeToProcessor[child.type];
      // TODO: Unsafe
      return processor ? processor(child as any) : processUnknown(child);
    })
    .filter((node) => node);

  return _.flatMap(list);
};
const processListItem = (node: ListItem): string => {
  const text = processFlowContent(node.children);
  return `• ${text}`;
};

const processInlineCode = (node: InlineCode): string => {
  return '`' + escapeCharacters(node.value) + '`';
};

const processStrong = (node: Strong): string => {
  return '*' + processPhrasingContent(node.children) + '*';
};

const processText = (node: Text): string => {
  return escapeCharacters(node.value);
};

const processThematicBreak = (_node: ThematicBreak): string => {
  return `\n\n${escapeCharacters('---')}\n\n`;
};

const processYaml = (node: Yaml): string => {
  return processCode({ ...node, type: 'code', lang: 'yaml' });
};

const processPhrasingContent = (node: PhrasingContent[]): string[] => {
  const typeToProcessor: { [key in PhrasingContent['type']]: (child: PhrasingContentMap[key]) => string } = {
    break: processBreak,
    delete: processDelete,
    emphasis: processEmphasis,
    footnoteReference: processUnknown, // TODO
    html: processUnknown, // TODO
    image: processUnknown, // TODO
    imageReference: processUnknown, // TODO
    inlineCode: processInlineCode,
    link: processLink,
    linkReference: processUnknown, // TODO
    strong: processStrong,
    text: processText,
  };

  return node.map((child) => {
    const processor = typeToProcessor[child.type];
    // TODO: unsafe
    return processor ? processor(child as any) : 'undefinedProcessor';
  });
};

const processParagraph = (node: Paragraph): string => {
  return processPhrasingContent(node.children) + '\n';
};

export const processMarkdown = (root: Root): string[] => {
  const content = root.children;

  const typeToProcessor: { [key in RootContent['type']]: (child: RootContentMap[key]) => string | string[] } = {
    blockquote: processUnknown, // TODO
    break: processBreak,
    code: processCode,
    definition: processUnknown, // TODO
    delete: processDelete,
    emphasis: processEmphasis,
    footnoteDefinition: processUnknown, // TODO
    footnoteReference: processUnknown, // TODO
    heading: processHeading,
    html: processUnknown, // TODO
    image: processUnknown, // TODO
    imageReference: processUnknown, // TODO
    inlineCode: processInlineCode,
    link: processLink,
    linkReference: processUnknown, // TODO
    list: processList,
    listItem: processListItem,
    paragraph: processParagraph,
    strong: processStrong,
    table: processUnknown, // TODO
    tableCell: processUnknown, // TODO
    tableRow: processUnknown, // TODO
    text: processText,
    thematicBreak: processThematicBreak,
    yaml: processYaml,
  };

  const list = content
    .map((node) => {
      const processor = typeToProcessor[node.type];
      // TODO: Unsafe
      return processor ? processor(node as any) : processUnknown(node);
    })
    .filter((node) => node);

  return _.flatMap(list);
};

export const cookMarkdown = async (text: string): Promise<string> => {
  const content = await unified().use(markdown).parse(text);

  console.log('DEBUG Raw text:', text);
  console.log('DEBUG Parsed content:', JSON.stringify(content));

  const response = processMarkdown(content as Root).join('');
  console.log('DEBUG: Pre sent:', response);

  return response;
};

export const cookMarkdownArray = async (text: string): Promise<string[]> => {
  const content = await unified().use(markdown).parse(text);

  console.log('DEBUG Raw text:', text);
  console.log('DEBUG Parsed content:', JSON.stringify(content));

  const response = processMarkdown(content as Root);
  console.log('DEBUG: Pre sent:', response);

  return response;
};
