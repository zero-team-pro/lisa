import {
  BlockContent,
  Break,
  Code,
  DefinitionContent,
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

type FlowContent = BlockContent | DefinitionContent;

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

const processList = (node: List): string => {
  return node.children.map((child) => processListItem(child)).join('\n') + '\n';
};

const processFlowContent = (node: FlowContent[]): string => {
  return node
    .map((child) => {
      if (child.type === 'paragraph') {
        const text = processParagraph(child);
        return `• ${text}`;
      }
    })
    .join('');
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

const processThematicBreak = (node: ThematicBreak): string => {
  return '\n\n---\n\n';
};

const processYaml = (node: Yaml): string => {
  return processCode({ ...node, type: 'code', lang: 'yaml' });
};

const processPhrasingContent = (node: PhrasingContent[]): string => {
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

  return node
    .map((child) => {
      const processor = typeToProcessor[child.type];
      // TODO: unsafe
      return processor ? processor(child as any) : 'undefinedProcessor';
    })
    .join('');
};

const processParagraph = (node: Paragraph): string => {
  return processPhrasingContent(node.children) + '\n';
};

export const processMarkdown = (root: Root): string => {
  const content = root.children;

  const typeToProcessor: { [key in RootContent['type']]: (child: RootContentMap[key]) => string } = {
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

  return content
    .map((node) => {
      const processor = typeToProcessor[node.type];
      // TODO: Unsafe
      return processor ? processor(node as any) : processUnknown(node);
    })
    .filter((node) => node)
    .join('');
};

export const cookMarkdown = async (text: string) => {
  const content = await unified().use(markdown).parse(text);

  console.log('DEBUG Raw text:', text);
  console.log('DEBUG Parsed content:', JSON.stringify(content));

  const response = processMarkdown(content as Root);
  console.log('DEBUG: Pre sent:', response);

  return response;
};
