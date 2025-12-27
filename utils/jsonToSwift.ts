/**
 * JSON to Swift Struct Converter
 * Converts JSON objects to Swift struct definitions with Codable support
 */

interface ConversionOptions {
  rootStructName?: string;
}

interface ConversionResult {
  success: boolean;
  output?: string;
  example?: string;
  error?: string;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

/**
 * Convert property name to camelCase for Swift
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[_-](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (char) => char.toLowerCase());
}

function generateInstantiationExample(jsonString: string, rootName: string): string {
  try {
    const obj = JSON.parse(jsonString);

    function formatValue(value: any, indent: number = 4): string {
      const spaces = ' '.repeat(indent);

      if (value === null) return 'nil';
      if (typeof value === 'string') return `"${value}"`;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);

      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.map(v => `${spaces}    ${formatValue(v, indent + 4)}`).join(',\n');
        return `[\n${items}\n${spaces}]`;
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) return rootName + '()';
        const props = entries.map(([k, v]) => {
          const propName = toCamelCase(k);
          return `${spaces}    ${propName}: ${formatValue(v, indent + 4)}`;
        }).join(',\n');
        return `${rootName}(\n${props}\n${spaces})`;
      }

      return 'nil';
    }

    const entries = Object.entries(obj);
    const props = entries.map(([key, value]) => {
      const propName = toCamelCase(key);
      return `    ${propName}: ${formatValue(value, 4)}`;
    }).join(',\n');

    return `let example = ${rootName}(\n${props}\n)`;
  } catch (error) {
    return `// Unable to generate example: Invalid JSON`;
  }
}

/**
 * Convert struct name to PascalCase for Swift
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[_-](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (char) => char.toUpperCase());
}

/**
 * Infer Swift type from JSON value
 */
function inferSwiftType(
  value: JsonValue,
  propertyName: string,
  nestedStructs: Map<string, string>
): string {
  if (value === null) {
    return 'String';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[String]';
    }

    const firstItem = value[0];
    if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
      const structName = toPascalCase(propertyName);
      const structCode = generateStruct(structName, firstItem as JsonObject, nestedStructs);
      nestedStructs.set(structName, structCode);
      return `[${structName}]`;
    }

    const itemType = inferSwiftType(firstItem!, '', nestedStructs);
    return `[${itemType}]`;
  }

  if (typeof value === 'object') {
    const structName = toPascalCase(propertyName);
    const structCode = generateStruct(structName, value as JsonObject, nestedStructs);
    nestedStructs.set(structName, structCode);
    return structName;
  }

  switch (typeof value) {
    case 'string':
      return 'String';
    case 'number':
      return Number.isInteger(value) ? 'Int' : 'Double';
    case 'boolean':
      return 'Bool';
    default:
      return 'String';
  }
}

/**
 * Merge types from multiple samples to detect optional properties
 */
function mergePropertyTypes(samples: JsonObject[]): Map<string, { type: string; optional: boolean }> {
  const propertyMap = new Map<string, { type: string; optional: boolean }>();
  const allKeys = new Set<string>();

  // Collect all keys
  samples.forEach(sample => {
    Object.keys(sample).forEach(key => allKeys.add(key));
  });

  const nestedStructs = new Map<string, string>();

  // Check each key
  allKeys.forEach(key => {
    const values = samples.map(s => s[key]).filter(v => v !== undefined);
    const appearsInAll = values.length === samples.length;

    if (values.length > 0) {
      const type = inferSwiftType(values[0]!, key, nestedStructs);
      propertyMap.set(key, {
        type,
        optional: !appearsInAll,
      });
    }
  });

  return propertyMap;
}

/**
 * Generate a Swift struct from a JSON object
 */
function generateStruct(
  structName: string,
  obj: JsonObject,
  nestedStructs: Map<string, string>
): string {
  const properties: string[] = [];

  Object.entries(obj).forEach(([key, value]) => {
    const propertyName = toCamelCase(key);
    const propertyType = inferSwiftType(value, key, nestedStructs);
    properties.push(`    let ${propertyName}: ${propertyType}`);
  });

  return `struct ${structName}: Codable {\n${properties.join('\n')}\n}`;
}

/**
 * Generate Swift struct with optional support from multiple samples
 */
function generateStructFromMultipleSamples(
  structName: string,
  samples: JsonObject[],
  nestedStructs: Map<string, string>
): string {
  const propertyMap = mergePropertyTypes(samples);
  const properties: string[] = [];

  propertyMap.forEach((info, key) => {
    const propertyName = toCamelCase(key);
    const optionalMarker = info.optional ? '?' : '';
    properties.push(`    let ${propertyName}: ${info.type}${optionalMarker}`);
  });

  return `struct ${structName}: Codable {\n${properties.join('\n')}\n}`;
}

/**
 * Convert JSON to Swift structs
 */
export function convertJsonToSwift(
  jsonInputs: string[],
  options: ConversionOptions = {}
): ConversionResult {
  const { rootStructName = 'Root' } = options;

  try {
    // Parse all JSON inputs
    const parsedObjects: JsonObject[] = jsonInputs.map(input => {
      const parsed = JSON.parse(input);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Input must be a JSON object');
      }
      return parsed as JsonObject;
    });

    const nestedStructs = new Map<string, string>();

    // Generate root struct
    const rootStruct =
      parsedObjects.length > 1
        ? generateStructFromMultipleSamples(rootStructName, parsedObjects, nestedStructs)
        : generateStruct(rootStructName, parsedObjects[0]!, nestedStructs);

    // Combine all structs
    const structs = [rootStruct, ...Array.from(nestedStructs.values())];
    const output = structs.join('\n\n');

    const example = jsonInputs[0] ? generateInstantiationExample(jsonInputs[0], rootStructName) : '';

    return {
      success: true,
      output,
      example,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
