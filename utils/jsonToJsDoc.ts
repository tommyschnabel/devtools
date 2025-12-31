/**
 * JSON to JSDoc type converter
 * Supports multiple JSON samples to detect optional fields
 */

interface TypeInfo {
  type: string;
  isOptional: boolean;
}

interface TypedefDefinition {
  name: string;
  properties: Map<string, TypeInfo>;
}

const generatedTypedefs = new Map<string, TypedefDefinition>();
let typedefCounter = 0;

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getJsDocType(value: any, propertyName: string = '', parentName: string = ''): string {
  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'Array<*>';
    }

    // Check if all items have the same type
    const types = new Set(value.map(item => getJsDocType(item, propertyName, parentName)));

    if (types.size === 1) {
      const itemType = Array.from(types)[0];
      return `Array<${itemType}>`;
    }

    // Mixed types - create union
    return `Array<(${Array.from(types).join('|')})>`;
  }

  if (type === 'object') {
    // Generate typedef name based on property name
    const typedefName = propertyName
      ? capitalizeFirst(propertyName.replace(/[^a-zA-Z0-9]/g, ''))
      : `Type${typedefCounter++}`;

    const fullTypedefName = parentName && propertyName
      ? `${parentName}${typedefName}`
      : typedefName;

    // Create typedef for nested object
    if (!generatedTypedefs.has(fullTypedefName)) {
      const typedefDef: TypedefDefinition = {
        name: fullTypedefName,
        properties: new Map(),
      };

      for (const [key, val] of Object.entries(value)) {
        typedefDef.properties.set(key, {
          type: getJsDocType(val, key, fullTypedefName),
          isOptional: false,
        });
      }

      generatedTypedefs.set(fullTypedefName, typedefDef);
    }

    return fullTypedefName;
  }

  return '*';
}

function mergeObjectSchemas(obj1: any, obj2: any, propertyName: string = '', parentName: string = ''): void {
  const typedefName = propertyName
    ? capitalizeFirst(propertyName.replace(/[^a-zA-Z0-9]/g, ''))
    : 'Root';

  const fullTypedefName = parentName && propertyName
    ? `${parentName}${typedefName}`
    : typedefName;

  const existingTypedef = generatedTypedefs.get(fullTypedefName);
  if (!existingTypedef) return;

  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));

  // Mark fields as optional if they don't appear in both objects
  for (const key of keys1) {
    if (!keys2.has(key)) {
      const propInfo = existingTypedef.properties.get(key);
      if (propInfo) {
        propInfo.isOptional = true;
      }
    }
  }

  for (const key of keys2) {
    if (!keys1.has(key)) {
      // Field exists in obj2 but not obj1 - add as optional
      existingTypedef.properties.set(key, {
        type: getJsDocType(obj2[key], key, fullTypedefName),
        isOptional: true,
      });
    } else {
      // Field exists in both - check if nested object needs merging
      if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' &&
          !Array.isArray(obj1[key]) && !Array.isArray(obj2[key]) &&
          obj1[key] !== null && obj2[key] !== null) {
        mergeObjectSchemas(obj1[key], obj2[key], key, fullTypedefName);
      }
    }
  }
}

function generateTypedef(def: TypedefDefinition): string {
  const lines: string[] = ['/**', ` * @typedef {Object} ${def.name}`];

  for (const [propName, typeInfo] of def.properties) {
    const optionalMarker = typeInfo.isOptional ? `[${propName}]` : propName;
    lines.push(` * @property {${typeInfo.type}} ${optionalMarker}`);
  }

  lines.push(' */');
  return lines.join('\n');
}

export interface ConversionOptions {
  rootTypedefName?: string;
}

function generateUsageExample(jsonString: string, rootName: string): string {
  try {
    const obj = JSON.parse(jsonString);

    function formatValue(value: any, indent: number = 2): string {
      const spaces = ' '.repeat(indent);

      if (value === null) return 'null';
      if (typeof value === 'string') return `"${value}"`;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);

      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.map(v => `${spaces}  ${formatValue(v, indent + 2)}`).join(',\n');
        return `[\n${items}\n${spaces}]`;
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) return '{}';
        const props = entries.map(([k, v]) => `${spaces}  ${k}: ${formatValue(v, indent + 2)}`).join(',\n');
        return `{\n${props}\n${spaces}}`;
      }

      return 'undefined';
    }

    const entries = Object.entries(obj);
    const props = entries.map(([key, value]) => `  ${key}: ${formatValue(value, 2)}`).join(',\n');

    return `/** @type {${rootName}} */\nconst example = {\n${props}\n};`;
  } catch (error) {
    return `// Unable to generate example: Invalid JSON`;
  }
}

/**
 * Convert JSON objects to JSDoc typedefs
 * @param jsonStrings - Array of JSON strings (multiple samples to detect optional fields)
 * @param options - Conversion options
 * @returns JSDoc typedef definitions
 */
export function convertJsonToJsDoc(
  jsonStrings: string[],
  options: ConversionOptions = {}
): { success: boolean; output?: string; example?: string; error?: string } {
  try {
    // Reset state
    generatedTypedefs.clear();
    typedefCounter = 0;

    if (jsonStrings.length === 0) {
      return { success: false, error: 'No JSON provided' };
    }

    const parsedObjects: any[] = [];

    // Parse all JSON strings
    for (const jsonStr of jsonStrings) {
      if (!jsonStr.trim()) continue;
      const parsed = JSON.parse(jsonStr);
      parsedObjects.push(parsed);
    }

    if (parsedObjects.length === 0) {
      return { success: false, error: 'No valid JSON objects' };
    }

    // Generate types from first object
    const rootName = options.rootTypedefName || 'Root';
    const firstObj = parsedObjects[0];

    // Create root typedef
    const rootTypedef: TypedefDefinition = {
      name: rootName,
      properties: new Map(),
    };

    for (const [key, value] of Object.entries(firstObj)) {
      rootTypedef.properties.set(key, {
        type: getJsDocType(value, key, rootName),
        isOptional: false,
      });
    }

    generatedTypedefs.set(rootName, rootTypedef);

    // Merge with additional objects to detect optional fields
    for (let i = 1; i < parsedObjects.length; i++) {
      mergeObjectSchemas(parsedObjects[0], parsedObjects[i], '', '');
    }

    // Generate JSDoc code
    const typedefCode: string[] = [];

    // Generate nested typedefs first
    const sortedTypedefs = Array.from(generatedTypedefs.values()).sort((a, b) => {
      // Root typedef last
      if (a.name === rootName) return 1;
      if (b.name === rootName) return -1;
      return a.name.localeCompare(b.name);
    });

    for (const typedefDef of sortedTypedefs) {
      typedefCode.push(generateTypedef(typedefDef));
    }

    const example = jsonStrings[0] ? generateUsageExample(jsonStrings[0], rootName) : '';

    return {
      success: true,
      output: typedefCode.join('\n\n'),
      example,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert JSON',
    };
  }
}
