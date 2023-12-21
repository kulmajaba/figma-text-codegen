import { getResolvedTextNodesFromNodes } from './pluginUtils';

const unboundTextsTitle = 'Unbound texts';

/**
 *
 * @param array Reference to result array
 */
export const upsertCogegenResultArray = (array: CodegenResult[], value: CodegenResult) => {
  const index = array.findIndex((item) => item.title === value.title);
  if (index === -1) {
    array.push(value);
  } else {
    array[index].code = array[index].code + '\n' + value.code;
  }
};

const codegen: (event: CodegenEvent) => CodegenResult[] = ({ node }) => {
  const includeName =
    figma.codegen.preferences.customSettings.includeName !== undefined
      ? figma.codegen.preferences.customSettings.includeName === 'true'
      : true;

  const result: CodegenResult[] = [];

  const textNodes = getResolvedTextNodesFromNodes([node]);
  textNodes.forEach((textNode) => {
    const boundVariableAlias = textNode.boundVariables?.characters;

    if (boundVariableAlias) {
      const variable = figma.variables.getVariableById(boundVariableAlias.id);
      if (variable) {
        const values = variable.valuesByMode;
        const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
        if (collection) {
          const modes = collection.modes;
          modes.forEach((mode) => {
            const name = mode.name;
            const value = values[mode.modeId];
            const code = includeName ? `"${variable.name}": ${JSON.stringify(value)}` : `${JSON.stringify(value)}`;

            const resultForMode: CodegenResult = {
              title: name,
              language: 'JSON',
              code
            };

            upsertCogegenResultArray(result, resultForMode);
          });
        }
      }
    } else {
      const resultForNode: CodegenResult = {
        title: unboundTextsTitle,
        language: 'PLAINTEXT',
        code: JSON.stringify(textNode.characters)
      };
      upsertCogegenResultArray(result, resultForNode);
    }
  });

  result.sort((a, b) => (a.title === unboundTextsTitle ? 1 : b.title === unboundTextsTitle ? -1 : 0));
  return result;
};

figma.codegen.on('generate', codegen);
figma.on('close', () => figma.codegen.off('generate', codegen));
