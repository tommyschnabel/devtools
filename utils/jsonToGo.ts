/**
 * JSON to Go struct converter
 * Supports multiple JSON samples to detect pointer fields
 */

interface TypeInfo {
  type: string;
  isPointer: boolean;
  jsonTag: string;
}

interface StructDefinition {
  name: string;
  properties: Map<string, TypeInfo>;
}

const generatedStructs = new Map<string, StructDefinition>();
let structCounter = 0;

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toGoName(str: string): string {
  return str.split(/[^a-zA-Z0-9]+/).map(capitalizeFirst).join('');
}

function getGoType(value: any, propertyName: string = '', parentName: string = ''): string {
  if (value === null) {
    return 'interface{}';
  }

  const type = typeof value;

  if (type === 'string') return 'string';
  if (type === 'number') {
    return Number.isInteger(value) ? 'int' : 'float64';
  }
  if (type === 'boolean') return 'bool';

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]interface{}';
    }

    const types = new Set(value.map(item => getGoType(item, propertyName, parentName)));

    if (types.size === 1) {
      const itemType = Array.from(types)[0];
      return `[]${itemType}`;
    }

    return '[]interface{}';
  }

  if (type === 'object') {
    const structName = propertyName
      ? toGoName(propertyName)
      : `Struct${structCounter++}`;

    const fullStructName = parentName && propertyName
      ? `${parentName}${structName}`
      : structName;

    if (!generatedStructs.has(fullStructName)) {
      const structDef: StructDefinition = {
        name: fullStructName,
        properties: new Map(),
      };

      for (const [key, val] of Object.entries(value)) {
        structDef.properties.set(toGoName(key), {
          type: getGoType(val, key, fullStructName),
          isPointer: false,
          jsonTag: key,
        });
      }

      generatedStructs.set(fullStructName, structDef);
    }

    return fullStructName;
  }

  return 'interface{}';
}

function mergeObjectSchemas(obj1: any, obj2: any, propertyName: string = '', parentName: string = ''): void {
  const structName = propertyName
    ? toGoName(propertyName)
    : 'Root';

  const fullStructName = parentName && propertyName
    ? `${parentName}${structName}`
    : structName;

  const existingStruct = generatedStructs.get(fullStructName);
  if (!existingStruct) return;

  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));

  for (const key of keys1) {
    const goKey = toGoName(key);
    if (!keys2.has(key)) {
      const propInfo = existingStruct.properties.get(goKey);
      if (propInfo) {
        propInfo.isPointer = true;
      }
    }
  }

  for (const key of keys2) {
    const goKey = toGoName(key);
    if (!keys1.has(key)) {
      existingStruct.properties.set(goKey, {
        type: getGoType(obj2[key], key, fullStructName),
        isPointer: true,
        jsonTag: key,
      });
    } else {
      if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' &&
          !Array.isArray(obj1[key]) && !Array.isArray(obj2[key]) &&
          obj1[key] !== null && obj2[key] !== null) {
        mergeObjectSchemas(obj1[key], obj2[key], key, fullStructName);
      }
    }
  }
}

function generateStruct(def: StructDefinition): string {
  const lines: string[] = [`type ${def.name} struct {`];

  for (const [propName, typeInfo] of def.properties) {
    const pointer = typeInfo.isPointer ? '*' : '';
    const jsonTag = `\`json:"${typeInfo.jsonTag}${typeInfo.isPointer ? ',omitempty' : ''}"\``;
    lines.push(`    ${propName} ${pointer}${typeInfo.type} ${jsonTag}`);
  }

  lines.push('}');
  return lines.join('\n');
}

export interface ConversionOptions {
  rootStructName?: string;
}

function generateInstantiationExample(jsonString: string, rootName: string): string {
  try {
    const obj = JSON.parse(jsonString);

    function formatValue(value: any, indent: number = 1): string {
      const tabs = '\t'.repeat(indent);

      if (value === null) return 'nil';
      if (typeof value === 'string') return `"${value}"`;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);

      if (Array.isArray(value)) {
        if (value.length === 0) return '[]interface{}{}';
        const items = value.map(v => `${tabs}\t${formatValue(v, indent + 1)}`).join(',\n');
        return `[]interface{}{\n${items},\n${tabs}}`;
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) return '{}';
        const props = entries.map(([k, v]) => {
          const goKey = toGoName(k);
          return `${tabs}\t${goKey}: ${formatValue(v, indent + 1)}`;
        }).join(',\n');
        return `{\n${props},\n${tabs}}`;
      }

      return 'nil';
    }

    const entries = Object.entries(obj);
    const props = entries.map(([key, value]) => {
      const goKey = toGoName(key);
      return `\t${goKey}: ${formatValue(value, 1)}`;
    }).join(',\n');

    return `example := ${rootName}{\n${props},\n}`;
  } catch (error) {
    return `// Unable to generate example: Invalid JSON`;
  }
}

/**
 * Convert JSON objects to Go structs
 * @param jsonStrings - Array of JSON strings (multiple samples to detect optional fields)
 * @param options - Conversion options
 * @returns Go struct definitions
 */
export function convertJsonToGo(
  jsonStrings: string[],
  options: ConversionOptions = {}
): { success: boolean; output?: string; example?: string; error?: string } {
  try {
    generatedStructs.clear();
    structCounter = 0;

    if (jsonStrings.length === 0) {
      return { success: false, error: 'No JSON provided' };
    }

    const parsedObjects: any[] = [];

    for (const jsonStr of jsonStrings) {
      if (!jsonStr.trim()) continue;
      const parsed = JSON.parse(jsonStr);
      parsedObjects.push(parsed);
    }

    if (parsedObjects.length === 0) {
      return { success: false, error: 'No valid JSON objects' };
    }

    const rootName = options.rootStructName || 'Root';
    const firstObj = parsedObjects[0];

    const rootStruct: StructDefinition = {
      name: rootName,
      properties: new Map(),
    };

    for (const [key, value] of Object.entries(firstObj)) {
      rootStruct.properties.set(toGoName(key), {
        type: getGoType(value, key, rootName),
        isPointer: false,
        jsonTag: key,
      });
    }

    generatedStructs.set(rootName, rootStruct);

    for (let i = 1; i < parsedObjects.length; i++) {
      mergeObjectSchemas(parsedObjects[0], parsedObjects[i], '', '');
    }

    const structCode: string[] = [];

    const sortedStructs = Array.from(generatedStructs.values()).sort((a, b) => {
      if (a.name === rootName) return 1;
      if (b.name === rootName) return -1;
      return a.name.localeCompare(b.name);
    });

    for (const structDef of sortedStructs) {
      structCode.push(generateStruct(structDef));
    }

    const example = jsonStrings[0] ? generateInstantiationExample(jsonStrings[0], rootName) : '';

    return {
      success: true,
      output: structCode.join('\n\n'),
      example,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert JSON',
    };
  }
}
