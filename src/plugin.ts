import { getResolvedTextNodesFromNodes } from './pluginUtils';

import { Casing } from './types';

const unboundTextsTitle = 'Unbound texts';

/**
 * Splits a string into words by upper case letters, dashes, and underscores.
 */
const splitName = (name: string): string[] => {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camel case
    .replace(/[-_]/g, ' ') // Split dashes and underscores
    .split(' ') // Split by spaces
    .filter((word) => word.length > 0); // Remove empty strings
};

const getVariableName = (variableName: string, replaceSlashes: string, casing: Casing): string => {
  let name = variableName;
  if (replaceSlashes) {
    name = name.replace(/\//g, replaceSlashes);
  }

  switch (casing) {
    case 'original':
      return name;
    case 'camel':
      return splitName(name).reduce((acc, word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return acc + word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }, '');
    case 'kebab':
      return splitName(name).join('-').toLowerCase();
    case 'pascal': {
      let newName = splitName(name).reduce((acc, word) => {
        return acc + word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }, '');
      newName = newName.split(replaceSlashes).reduce((acc, word) => {
        return acc + word.charAt(0).toUpperCase() + word.slice(1) + replaceSlashes;
      }, '');
      return newName;
    }
    case 'snake':
      return splitName(name).join('_').toLowerCase();
  }
};

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

const codegen: (event: CodegenEvent) => Promise<CodegenResult[]> = async ({ node }) => {
  const includeName =
    figma.codegen.preferences.customSettings.includeName !== undefined
      ? figma.codegen.preferences.customSettings.includeName === 'true'
      : true;

  const replaceSlashes =
    figma.codegen.preferences.customSettings.replaceSlashes !== undefined
      ? figma.codegen.preferences.customSettings.replaceSlashes
      : '/';

  const casing: Casing =
    figma.codegen.preferences.customSettings.casing !== undefined
      ? (figma.codegen.preferences.customSettings.casing as Casing)
      : 'original';

  const trailingComma =
    figma.codegen.preferences.customSettings.trailingComma !== undefined
      ? figma.codegen.preferences.customSettings.trailingComma === 'true'
      : false;

  console.log(
    'inlcludeName',
    includeName,
    'replaceSlashes',
    replaceSlashes,
    'casing',
    casing,
    'trailingComma',
    trailingComma
  );

  const result: CodegenResult[] = [];

  const textNodes = getResolvedTextNodesFromNodes([node]);

  const promises = textNodes.map((textNode) => {
    return new Promise<void>(async (resolve) => {
      const boundVariableAlias = textNode.boundVariables?.characters;

      if (boundVariableAlias) {
        const variable = await figma.variables.getVariableByIdAsync(boundVariableAlias.id);
        if (variable) {
          const values = variable.valuesByMode;
          const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
          if (collection) {
            const modes = collection.modes;

            modes.forEach((mode) => {
              const name = mode.name;
              const value = values[mode.modeId];
              const variableName = getVariableName(variable.name, replaceSlashes, casing);
              const code = `${includeName ? `"${variableName}": ` : ''}${JSON.stringify(value)}${trailingComma ? ',' : ''}`;

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
      resolve();
    });
  });

  await Promise.all(promises);

  result.sort((a, b) => (a.title === unboundTextsTitle ? 1 : b.title === unboundTextsTitle ? -1 : 0));

  return result;
};

figma.codegen.on('generate', codegen);
figma.on('close', () => figma.codegen.off('generate', codegen));
