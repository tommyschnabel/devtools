/**
 * JSON to TypeScript type converter
 * Supports multiple JSON samples to detect optional fields
 */

interface TypeInfo {
  type: string;
  isOptional: boolean;
}

interface InterfaceDefinition {
  name: string;
  properties: Map<string, TypeInfo>;
}

const generatedInterfaces = new Map<string, InterfaceDefinition>();
let interfaceCounter = 0;

function sanitizePropertyName(name: string): string {
  // Handle property names with special characters
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    return name;
  }
  return `"${name}"`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTypeName(value: any, propertyName: string = '', parentName: string = ''): string {
  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'any[]';
    }

    // Check if all items have the same type
    const types = new Set(value.map(item => getTypeName(item, propertyName, parentName)));

    if (types.size === 1) {
      const itemType = Array.from(types)[0];
      return `${itemType}[]`;
    }

    // Mixed types - create union
    return `(${Array.from(types).join(' | ')})[]`;
  }

  if (type === 'object') {
    // Generate interface name based on property name
    const interfaceName = propertyName
      ? capitalizeFirst(propertyName.replace(/[^a-zA-Z0-9]/g, ''))
      : `Interface${interfaceCounter++}`;

    const fullInterfaceName = parentName && propertyName
      ? `${parentName}${interfaceName}`
      : interfaceName;

    // Create interface for nested object
    if (!generatedInterfaces.has(fullInterfaceName)) {
      const interfaceDef: InterfaceDefinition = {
        name: fullInterfaceName,
        properties: new Map(),
      };

      for (const [key, val] of Object.entries(value)) {
        interfaceDef.properties.set(key, {
          type: getTypeName(val, key, fullInterfaceName),
          isOptional: false,
        });
      }

      generatedInterfaces.set(fullInterfaceName, interfaceDef);
    }

    return fullInterfaceName;
  }

  return 'any';
}

function mergeObjectSchemas(obj1: any, obj2: any, propertyName: string = '', parentName: string = ''): void {
  const interfaceName = propertyName
    ? capitalizeFirst(propertyName.replace(/[^a-zA-Z0-9]/g, ''))
    : 'Root';

  const fullInterfaceName = parentName && propertyName
    ? `${parentName}${interfaceName}`
    : interfaceName;

  const existingInterface = generatedInterfaces.get(fullInterfaceName);
  if (!existingInterface) return;

  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));

  // Mark fields as optional if they don't appear in both objects
  for (const key of keys1) {
    if (!keys2.has(key)) {
      const propInfo = existingInterface.properties.get(key);
      if (propInfo) {
        propInfo.isOptional = true;
      }
    }
  }

  for (const key of keys2) {
    if (!keys1.has(key)) {
      // Field exists in obj2 but not obj1 - add as optional
      existingInterface.properties.set(key, {
        type: getTypeName(obj2[key], key, fullInterfaceName),
        isOptional: true,
      });
    } else {
      // Field exists in both - check if nested object needs merging
      if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' &&
          !Array.isArray(obj1[key]) && !Array.isArray(obj2[key]) &&
          obj1[key] !== null && obj2[key] !== null) {
        mergeObjectSchemas(obj1[key], obj2[key], key, fullInterfaceName);
      }
    }
  }
}

function generateInterface(def: InterfaceDefinition): string {
  const lines: string[] = [`export interface ${def.name} {`];

  for (const [propName, typeInfo] of def.properties) {
    const sanitizedName = sanitizePropertyName(propName);
    const optional = typeInfo.isOptional ? '?' : '';
    lines.push(`  ${sanitizedName}${optional}: ${typeInfo.type};`);
  }

  lines.push('}');
  return lines.join('\n');
}

export interface ConversionOptions {
  rootInterfaceName?: string;
}

/**
 * Convert JSON objects to TypeScript interfaces
 * @param jsonStrings - Array of JSON strings (multiple samples to detect optional fields)
 * @param options - Conversion options
 * @returns TypeScript interface definitions
 */
export function convertJsonToTypeScript(
  jsonStrings: string[],
  options: ConversionOptions = {}
): { success: boolean; output?: string; error?: string } {
  try {
    // Reset state
    generatedInterfaces.clear();
    interfaceCounter = 0;

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
    const rootName = options.rootInterfaceName || 'Root';
    const firstObj = parsedObjects[0];

    // Create root interface
    const rootInterface: InterfaceDefinition = {
      name: rootName,
      properties: new Map(),
    };

    for (const [key, value] of Object.entries(firstObj)) {
      rootInterface.properties.set(key, {
        type: getTypeName(value, key, rootName),
        isOptional: false,
      });
    }

    generatedInterfaces.set(rootName, rootInterface);

    // Merge with additional objects to detect optional fields
    for (let i = 1; i < parsedObjects.length; i++) {
      mergeObjectSchemas(parsedObjects[0], parsedObjects[i], '', '');
    }

    // Generate TypeScript code
    const interfaceCode: string[] = [];

    // Generate nested interfaces first
    const sortedInterfaces = Array.from(generatedInterfaces.values()).sort((a, b) => {
      // Root interface last
      if (a.name === rootName) return 1;
      if (b.name === rootName) return -1;
      return a.name.localeCompare(b.name);
    });

    for (const interfaceDef of sortedInterfaces) {
      interfaceCode.push(generateInterface(interfaceDef));
    }

    return {
      success: true,
      output: interfaceCode.join('\n\n'),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert JSON',
    };
  }
}
