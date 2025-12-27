/**
 * XML formatting utilities
 */

function formatXmlNode(node: Node, indent: string = '', indentSize: number = 2): string {
  const indentStr = ' '.repeat(indentSize);
  let result = '';

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (text) {
      result = indent + text + '\n';
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    result = indent + '<' + element.nodeName;

    // Add attributes
    if (element.attributes.length > 0) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i]!;
        result += ` ${attr.name}="${attr.value}"`;
      }
    }

    if (element.childNodes.length === 0) {
      result += '/>\n';
    } else {
      result += '>\n';

      // Process children
      for (let i = 0; i < element.childNodes.length; i++) {
        result += formatXmlNode(element.childNodes[i]!, indent + indentStr, indentSize);
      }

      result += indent + '</' + element.nodeName + '>\n';
    }
  } else if (node.nodeType === Node.CDATA_SECTION_NODE) {
    result = indent + '<![CDATA[' + node.textContent + ']]>\n';
  } else if (node.nodeType === Node.COMMENT_NODE) {
    result = indent + '<!--' + node.textContent + '-->\n';
  }

  return result;
}

export function prettifyXml(xmlString: string, indentSize: number = 2): { success: boolean; output?: string; error?: string } {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        error: parseError.textContent || 'Invalid XML',
      };
    }

    // Add XML declaration if not present
    let result = '';
    if (!xmlString.trim().startsWith('<?xml')) {
      result = '<?xml version="1.0" encoding="UTF-8"?>\n';
    }

    // Format the document
    if (xmlDoc.documentElement) {
      result += formatXmlNode(xmlDoc.documentElement, '', indentSize).trim();
    }

    return {
      success: true,
      output: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse XML',
    };
  }
}

export function minifyXml(xmlString: string): { success: boolean; output?: string; error?: string } {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        error: parseError.textContent || 'Invalid XML',
      };
    }

    const serializer = new XMLSerializer();
    const minified = serializer.serializeToString(xmlDoc);

    return {
      success: true,
      output: minified,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse XML',
    };
  }
}
