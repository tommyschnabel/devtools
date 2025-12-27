/**
 * JSON to C# Class Converter
 * Converts JSON objects to C# class definitions
 */

interface ConversionOptions {
  rootClassName?: string;
  addJsonPropertyAttributes?: boolean;
  usePascalCase?: boolean;
}

interface ConversionResult {
  success: boolean;
  output?: string;
  error?: string;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

/**
 * Convert property name to PascalCase for C#
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[_-](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (char) => char.toUpperCase());
}

/**
 * Infer C# type from JSON value
 */
function inferCSharpType(
  value: JsonValue,
  propertyName: string,
  nestedClasses: Map<string, string>,
  options: ConversionOptions
): string {
  if (value === null) {
    return 'object';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'List<object>';
    }

    const firstItem = value[0];
    if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
      const className = toPascalCase(propertyName);
      const classCode = generateClass(className, firstItem as JsonObject, nestedClasses, options);
      nestedClasses.set(className, classCode);
      return `List<${className}>`;
    }

    const itemType = inferCSharpType(firstItem!, '', nestedClasses, options);
    return `List<${itemType}>`;
  }

  if (typeof value === 'object') {
    const className = toPascalCase(propertyName);
    const classCode = generateClass(className, value as JsonObject, nestedClasses, options);
    nestedClasses.set(className, classCode);
    return className;
  }

  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return Number.isInteger(value) ? 'int' : 'double';
    case 'boolean':
      return 'bool';
    default:
      return 'object';
  }
}

/**
 * Merge types from multiple samples to detect nullable properties
 */
function mergePropertyTypes(
  samples: JsonObject[],
  nestedClasses: Map<string, string>,
  options: ConversionOptions
): Map<string, { type: string; optional: boolean }> {
  const propertyMap = new Map<string, { type: string; optional: boolean }>();
  const allKeys = new Set<string>();

  // Collect all keys
  samples.forEach(sample => {
    Object.keys(sample).forEach(key => allKeys.add(key));
  });

  // Check each key
  allKeys.forEach(key => {
    const values = samples.map(s => s[key]).filter(v => v !== undefined);
    const appearsInAll = values.length === samples.length;

    if (values.length > 0) {
      const type = inferCSharpType(values[0]!, key, nestedClasses, options);
      propertyMap.set(key, {
        type,
        optional: !appearsInAll,
      });
    }
  });

  return propertyMap;
}

/**
 * Generate a C# class from a JSON object
 */
function generateClass(
  className: string,
  obj: JsonObject,
  nestedClasses: Map<string, string>,
  options: ConversionOptions
): string {
  const properties: string[] = [];
  const { addJsonPropertyAttributes = false, usePascalCase = false } = options;

  Object.entries(obj).forEach(([key, value]) => {
    const propertyName = usePascalCase ? toPascalCase(key) : key;
    const propertyType = inferCSharpType(value, key, nestedClasses, options);

    const lines: string[] = [];
    if (addJsonPropertyAttributes) {
      lines.push(`    [JsonProperty("${key}")]`);
    }
    lines.push(`    public ${propertyType} ${propertyName} { get; set; }`);

    properties.push(lines.join('\n'));
  });

  return `public class ${className}\n{\n${properties.join('\n')}\n}`;
}

/**
 * Generate C# class with nullable support from multiple samples
 */
function generateClassFromMultipleSamples(
  className: string,
  samples: JsonObject[],
  nestedClasses: Map<string, string>,
  options: ConversionOptions
): string {
  const propertyMap = mergePropertyTypes(samples, nestedClasses, options);
  const properties: string[] = [];
  const { addJsonPropertyAttributes = false, usePascalCase = false } = options;

  propertyMap.forEach((info, key) => {
    const propertyName = usePascalCase ? toPascalCase(key) : key;
    const nullableMarker = info.optional ? '?' : '';

    const lines: string[] = [];
    if (addJsonPropertyAttributes) {
      lines.push(`    [JsonProperty("${key}")]`);
    }
    lines.push(`    public ${info.type}${nullableMarker} ${propertyName} { get; set; }`);

    properties.push(lines.join('\n'));
  });

  return `public class ${className}\n{\n${properties.join('\n')}\n}`;
}

/**
 * Convert JSON to C# classes
 */
export function convertJsonToCSharp(
  jsonInputs: string[],
  options: ConversionOptions = {}
): ConversionResult {
  const { rootClassName = 'Root' } = options;

  try {
    // Parse all JSON inputs
    const parsedObjects: JsonObject[] = jsonInputs.map(input => {
      const parsed = JSON.parse(input);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Input must be a JSON object');
      }
      return parsed as JsonObject;
    });

    const nestedClasses = new Map<string, string>();

    // Generate root class
    const rootClass =
      parsedObjects.length > 1
        ? generateClassFromMultipleSamples(rootClassName, parsedObjects, nestedClasses, options)
        : generateClass(rootClassName, parsedObjects[0]!, nestedClasses, options);

    // Combine all classes
    const classes = [rootClass, ...Array.from(nestedClasses.values())];
    const output = classes.join('\n\n');

    return {
      success: true,
      output,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
