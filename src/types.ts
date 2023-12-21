export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export interface ExtendedTextNode extends TextNode {
  parentInvisible?: boolean;
}

export const nodeCanHaveChildren = (node: BaseNode): node is BaseNode & ChildrenMixin => {
  return 'children' in node;
};
