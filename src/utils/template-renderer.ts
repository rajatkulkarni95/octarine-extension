/**
 * Template rendering engine
 * Handles placeholder substitution, conditionals, loops, and formatters
 */

/**
 * Render a template string with data
 * Supports:
 * - {key} - Simple substitution
 * - {key:format} - Apply formatter
 * - {key:join:separator} - Join arrays
 * - {if:key}...{/if} - Conditionals
 * - {each:key}...{/each} - Loops
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template;

  // Process conditionals {if:key}...{/if}
  result = processConditionals(result, data);

  // Process loops {each:key}...{/each}
  result = processLoops(result, data);

  // Process simple placeholders {key} and formatted {key:format}
  result = processPlaceholders(result, data);

  // Clean up any remaining empty lines
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}

/**
 * Process conditional blocks {if:key}...{/if}
 */
function processConditionals(template: string, data: Record<string, any>): string {
  const ifPattern = /\{if:([^}]+)\}([\s\S]*?)\{\/if\}/g;

  return template.replace(ifPattern, (_match, key, content) => {
    const value = getValue(data, key.trim());

    // Check if value exists and is not empty
    const shouldInclude =
      value !== undefined &&
      value !== null &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0);

    return shouldInclude ? content : '';
  });
}

/**
 * Process loop blocks {each:key}...{/each}
 * Inside loops, use {value} to access current item
 */
function processLoops(template: string, data: Record<string, any>): string {
  const eachPattern = /\{each:([^}]+)\}([\s\S]*?)\{\/each\}/g;

  return template.replace(eachPattern, (_match, key, content) => {
    const value = getValue(data, key.trim());

    if (!Array.isArray(value) || value.length === 0) {
      return '';
    }

    return value
      .map((item, index) => {
        return content
          .replace(/\{value\}/g, String(item))
          .replace(/\{index\}/g, String(index));
      })
      .join('');
  });
}

/**
 * Process placeholders {key} and {key:format}
 */
function processPlaceholders(template: string, data: Record<string, any>): string {
  const placeholderPattern = /\{([^}]+)\}/g;

  return template.replace(placeholderPattern, (_match, placeholder) => {
    const parts = placeholder.split(':').map((p: string) => p.trim());
    const key = parts[0];
    const formatter = parts[1];
    const formatterArg = parts.slice(2).join(':');

    const value = getValue(data, key);

    if (value === undefined || value === null) {
      return '';
    }

    // Apply formatter if specified
    if (formatter) {
      return applyFormatter(value, formatter, formatterArg);
    }

    return String(value);
  });
}

/**
 * Get value from data object, supports nested keys
 */
function getValue(data: Record<string, any>, key: string): any {
  if (key.includes('.')) {
    const keys = key.split('.');
    let value: any = data;
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return undefined;
      }
    }
    return value;
  }
  return data[key];
}

/**
 * Apply formatter to value
 */
function applyFormatter(value: any, formatter: string, arg?: string): string {
  switch (formatter.toLowerCase()) {
    case 'join':
      if (Array.isArray(value)) {
        const separator = arg || ', ';
        return value.map(String).join(separator);
      }
      return String(value);

    case 'format':
      if (value instanceof Date || typeof value === 'string') {
        return formatDate(value, arg || 'MMM D, YYYY');
      }
      return String(value);

    case 'emoji':
      return getStatusEmoji(value);

    case 'text':
      return getStatusText(value);

    case 'plural':
      const num = typeof value === 'number' ? value : 1;
      const suffix = arg || 's';
      return num === 1 ? '' : suffix;

    case 'uppercase':
      return String(value).toUpperCase();

    case 'lowercase':
      return String(value).toLowerCase();

    case 'capitalize':
      return capitalize(String(value));

    case 'truncate':
      const maxLength = arg ? parseInt(arg, 10) : 100;
      const str = String(value);
      return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;

    default:
      return String(value);
  }
}

/**
 * Format date according to pattern
 */
function formatDate(value: Date | string, pattern: string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return String(value);
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const replacements: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MMMM: monthsFull[date.getMonth()],
    MMM: months[date.getMonth()],
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    M: String(date.getMonth() + 1),
    DD: String(date.getDate()).padStart(2, '0'),
    D: String(date.getDate()),
    HH: String(date.getHours()).padStart(2, '0'),
    H: String(date.getHours()),
    mm: String(date.getMinutes()).padStart(2, '0'),
    m: String(date.getMinutes()),
    ss: String(date.getSeconds()).padStart(2, '0'),
    s: String(date.getSeconds()),
  };

  let result = pattern;
  for (const [token, replacement] of Object.entries(replacements)) {
    result = result.replace(token, replacement);
  }

  return result;
}

/**
 * Get emoji for status
 */
function getStatusEmoji(status: string): string {
  const normalized = String(status).toLowerCase();

  const emojiMap: Record<string, string> = {
    open: '🟢',
    opened: '🟢',
    closed: '❌',
    merged: '✅',
    draft: '📝',
    pending: '🟡',
    'in progress': '🟡',
    completed: '✅',
    done: '✅',
    todo: '⚪',
    canceled: '🚫',
    cancelled: '🚫',
  };

  return emojiMap[normalized] || '';
}

/**
 * Get text representation of status
 */
function getStatusText(status: string): string {
  return capitalize(String(status));
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
