/**
 * JSON to Rust struct converter
 * Supports multiple JSON samples to detect Option fields
 */

interface TypeInfo {
  type: string;
  isOption: boolean;
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

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[^a-z0-9]+/g, '_');
}

function toPascalCase(str: string): string {
  return str.split(/[^a-zA-Z0-9]+/).map(capitalizeFirst).join('');
}

function getRustType(value: any, propertyName: string = '', parentName: string = ''): string {
  if (value === null) {
    return 'serde_json::Value';
  }

  const type = typeof value;

  if (type === 'string') return 'String';
  if (type === 'number') {
    return Number.isInteger(value) ? 'i64' : 'f64';
  }
  if (type === 'boolean') return 'bool';

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'Vec<serde_json::Value>';
    }

    const types = new Set(value.map(item => getRustType(item, propertyName, parentName)));

    if (types.size === 1) {
      const itemType = Array.from(types)[0];
      return `Vec<${itemType}>`;
    }

    return 'Vec<serde_json::Value>';
  }

  if (type === 'object') {
    const structName = propertyName
      ? toPascalCase(propertyName)
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
        structDef.properties.set(key, {
          type: getRustType(val, key, fullStructName),
          isOption: false,
        });
      }

      generatedStructs.set(fullStructName, structDef);
    }

    return fullStructName;
  }

  return 'serde_json::Value';
}

function mergeObjectSchemas(obj1: any, obj2: any, propertyName: string = '', parentName: string = ''): void {
  const structName = propertyName
    ? toPascalCase(propertyName)
    : 'Root';

  const fullStructName = parentName && propertyName
    ? `${parentName}${structName}`
    : structName;

  const existingStruct = generatedStructs.get(fullStructName);
  if (!existingStruct) return;

  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));

  for (const key of keys1) {
    if (!keys2.has(key)) {
      const propInfo = existingStruct.properties.get(key);
      if (propInfo) {
        propInfo.isOption = true;
      }
    }
  }

  for (const key of keys2) {
    if (!keys1.has(key)) {
      existingStruct.properties.set(key, {
        type: getRustType(obj2[key], key, fullStructName),
        isOption: true,
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
  const lines: string[] = [
    '#[derive(Debug, Clone, Serialize, Deserialize)]',
    `pub struct ${def.name} {`,
  ];

  for (const [propName, typeInfo] of def.properties) {
    const snakeCaseName = toSnakeCase(propName);
    const rustType = typeInfo.isOption ? `Option<${typeInfo.type}>` : typeInfo.type;

    if (snakeCaseName !== propName) {
      lines.push(`    #[serde(rename = "${propName}")]`);
    }
    if (typeInfo.isOption) {
      lines.push(`    #[serde(skip_serializing_if = "Option::is_none")]`);
    }

    lines.push(`    pub ${snakeCaseName}: ${rustType},`);
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

    function formatValue(value: any, indent: number = 4): string {
      const spaces = ' '.repeat(indent);

      if (value === null) return 'None';
      if (typeof value === 'string') return `"${value}".to_string()`;
      if (typeof value === 'number') {
        return Number.isInteger(value) ? String(value) : `${value}`;
      }
      if (typeof value === 'boolean') return String(value);

      if (Array.isArray(value)) {
        if (value.length === 0) return 'vec![]';
        const items = value.map(v => `${spaces}    ${formatValue(v, indent + 4)}`).join(',\n');
        return `vec![\n${items}\n${spaces}]`;
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) return `${rootName} {}`;
        const props = entries.map(([k, v]) => {
          const snakeCaseName = toSnakeCase(k);
          return `${spaces}    ${snakeCaseName}: ${formatValue(v, indent + 4)}`;
        }).join(',\n');
        return `${rootName} {\n${props}\n${spaces}}`;
      }

      return 'None';
    }

    const entries = Object.entries(obj);
    const props = entries.map(([key, value]) => {
      const snakeCaseName = toSnakeCase(key);
      return `    ${snakeCaseName}: ${formatValue(value, 4)}`;
    }).join(',\n');

    return `let example = ${rootName} {\n${props}\n};`;
  } catch (error) {
    return `// Unable to generate example: Invalid JSON`;
  }
}

/**
 * Convert JSON objects to Rust structs
 * @param jsonStrings - Array of JSON strings (multiple samples to detect optional fields)
 * @param options - Conversion options
 * @returns Rust struct definitions
 */
export function convertJsonToRust(
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
      rootStruct.properties.set(key, {
        type: getRustType(value, key, rootName),
        isOption: false,
      });
    }

    generatedStructs.set(rootName, rootStruct);

    for (let i = 1; i < parsedObjects.length; i++) {
      mergeObjectSchemas(parsedObjects[0], parsedObjects[i], '', '');
    }

    const structCode: string[] = [
      'use serde::{Deserialize, Serialize};',
      '',
    ];

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
