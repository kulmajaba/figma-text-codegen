import { Mutable, ExtendedTextNode, nodeCanHaveChildren } from './types';

export const resolveProperties = <T extends object>(
  object: T,
  filterGetters?: (key: keyof T, object: T) => boolean
): T => {
  const descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(object));
  let getters = (Object.keys(descriptors) as (keyof T)[]).filter((key) => typeof descriptors[key].get === 'function');
  if (filterGetters) {
    getters = getters.filter((key) => filterGetters(key, object));
  }

  const objectWithProperties: Mutable<T> = {
    ...object
  };
  for (const getter of getters) {
    objectWithProperties[getter] = object[getter];
  }

  return objectWithProperties as T;
};

const getters: (keyof TextNode)[] = [
  'characters',
  'boundVariables',
];

const filterNodeGetters = <T extends SceneNode>(key: keyof T, node: T): boolean => {
  return getters.includes(key as keyof SceneNode);
};

const resolveNodeProperties = <T extends SceneNode>(node: T): T => {
  return resolveProperties(node, filterNodeGetters);
};

export const getResolvedTextNodesFromNodes = (
  nodes: ReadonlyArray<SceneNode>,
  parentInvisible: boolean = false
): ReadonlyArray<ExtendedTextNode> => {
  const textNodes: ExtendedTextNode[] = [];
  for (const node of nodes) {
    if (node.type === 'TEXT') {
      textNodes.push({ ...resolveNodeProperties(node), parentInvisible });
    } else if (nodeCanHaveChildren(node)) {
      textNodes.push(...getResolvedTextNodesFromNodes(node.children, parentInvisible || !node.visible));
    }
  }
  return textNodes;
};
