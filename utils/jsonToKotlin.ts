/**
 * JSON to Kotlin data class converter
 * Supports multiple JSON samples to detect nullable fields
 */

interface TypeInfo {
  type: string;
  isNullable: boolean;
}

interface DataClassDefinition {
  name: string;
  properties: Map<string, TypeInfo>;
}

const generatedClasses = new Map<string, DataClassDefinition>();
let classCounter = 0;

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str: string): string {
  return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

function getKotlinType(value: any, propertyName: string = '', parentName: string = ''): string {
  if (value === null) {
    return 'Any?';
  }

  const type = typeof value;

  if (type === 'string') return 'String';
  if (type === 'number') {
    return Number.isInteger(value) ? 'Int' : 'Double';
  }
  if (type === 'boolean') return 'Boolean';

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'List<Any>';
    }

    const types = new Set(value.map(item => getKotlinType(item, propertyName, parentName)));

    if (types.size === 1) {
      const itemType = Array.from(types)[0];
      return `List<${itemType}>`;
    }

    return 'List<Any>';
  }

  if (type === 'object') {
    const className = propertyName
      ? capitalizeFirst(toCamelCase(propertyName))
      : `DataClass${classCounter++}`;

    const fullClassName = parentName && propertyName
      ? `${parentName}${className}`
      : className;

    if (!generatedClasses.has(fullClassName)) {
      const classDef: DataClassDefinition = {
        name: fullClassName,
        properties: new Map(),
      };

      for (const [key, val] of Object.entries(value)) {
        classDef.properties.set(key, {
          type: getKotlinType(val, key, fullClassName),
          isNullable: false,
        });
      }

      generatedClasses.set(fullClassName, classDef);
    }

    return fullClassName;
  }

  return 'Any';
}

function mergeObjectSchemas(obj1: any, obj2: any, propertyName: string = '', parentName: string = ''): void {
  const className = propertyName
    ? capitalizeFirst(toCamelCase(propertyName))
    : 'Root';

  const fullClassName = parentName && propertyName
    ? `${parentName}${className}`
    : className;

  const existingClass = generatedClasses.get(fullClassName);
  if (!existingClass) return;

  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));

  for (const key of keys1) {
    if (!keys2.has(key)) {
      const propInfo = existingClass.properties.get(key);
      if (propInfo) {
        propInfo.isNullable = true;
      }
    }
  }

  for (const key of keys2) {
    if (!keys1.has(key)) {
      existingClass.properties.set(key, {
        type: getKotlinType(obj2[key], key, fullClassName),
        isNullable: true,
      });
    } else {
      if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' &&
          !Array.isArray(obj1[key]) && !Array.isArray(obj2[key]) &&
          obj1[key] !== null && obj2[key] !== null) {
        mergeObjectSchemas(obj1[key], obj2[key], key, fullClassName);
      }
    }
  }
}

function generateDataClass(def: DataClassDefinition): string {
  const lines: string[] = [`data class ${def.name}(`];

  const properties = Array.from(def.properties.entries());
  properties.forEach(([propName, typeInfo], index) => {
    const nullable = typeInfo.isNullable ? '?' : '';
    const defaultValue = typeInfo.isNullable ? ' = null' : '';
    const comma = index < properties.length - 1 ? ',' : '';
    lines.push(`    val ${propName}: ${typeInfo.type}${nullable}${defaultValue}${comma}`);
  });

  lines.push(')');
  return lines.join('\n');
}

export interface ConversionOptions {
  rootClassName?: string;
}

/**
 * Convert JSON objects to Kotlin data classes
 * @param jsonStrings - Array of JSON strings (multiple samples to detect nullable fields)
 * @param options - Conversion options
 * @returns Kotlin data class definitions
 */
export function convertJsonToKotlin(
  jsonStrings: string[],
  options: ConversionOptions = {}
): { success: boolean; output?: string; error?: string } {
  try {
    generatedClasses.clear();
    classCounter = 0;

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

    const rootName = options.rootClassName || 'Root';
    const firstObj = parsedObjects[0];

    const rootClass: DataClassDefinition = {
      name: rootName,
      properties: new Map(),
    };

    for (const [key, value] of Object.entries(firstObj)) {
      rootClass.properties.set(key, {
        type: getKotlinType(value, key, rootName),
        isNullable: false,
      });
    }

    generatedClasses.set(rootName, rootClass);

    for (let i = 1; i < parsedObjects.length; i++) {
      mergeObjectSchemas(parsedObjects[0], parsedObjects[i], '', '');
    }

    const classCode: string[] = [];

    const sortedClasses = Array.from(generatedClasses.values()).sort((a, b) => {
      if (a.name === rootName) return 1;
      if (b.name === rootName) return -1;
      return a.name.localeCompare(b.name);
    });

    for (const classDef of sortedClasses) {
      classCode.push(generateDataClass(classDef));
    }

    return {
      success: true,
      output: classCode.join('\n\n'),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert JSON',
    };
  }
}
