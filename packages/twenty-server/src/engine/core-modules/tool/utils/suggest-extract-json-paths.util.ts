import { isObject } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

const DEFAULT_MAX_SUGGESTIONS = 3;
const DEFAULT_SLICE_END = 5;
const MAX_WALK_DEPTH = 8;

type SuggestExtractJsonPathsOptions = {
  maxSuggestions?: number;
  sliceEnd?: number;
};

const quoteKeyIfNeeded = (key: string): string => {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return `.${key}`;
  }

  return `["${key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
};

const scoreArrayPath = ({
  path,
  length,
}: {
  path: string;
  length: number;
}): number => {
  let score = length;

  // Prefer the payload under ToolOutput.result — that is what agents need.
  if (path.startsWith('$.result')) {
    score += 100;
  }

  if (path.includes('.data.')) {
    score += 20;
  }

  return score;
};

// Walk JSON and suggest extract_json_paths expressions that target the largest
// useful arrays (with a safe slice), so spilled outputs stop requiring path guessing.
export const suggestExtractJsonPaths = (
  value: unknown,
  options: SuggestExtractJsonPathsOptions = {},
): string[] => {
  const maxSuggestions = options.maxSuggestions ?? DEFAULT_MAX_SUGGESTIONS;
  const sliceEnd = options.sliceEnd ?? DEFAULT_SLICE_END;

  type Candidate = { path: string; length: number; score: number };
  const candidates: Candidate[] = [];

  const visit = (node: unknown, path: string, depth: number): void => {
    if (depth > MAX_WALK_DEPTH || !isDefined(node) || !isObject(node)) {
      return;
    }

    if (Array.isArray(node)) {
      if (node.length === 0) {
        return;
      }

      candidates.push({
        path,
        length: node.length,
        score: scoreArrayPath({ path, length: node.length }),
      });

      // Descend into the first item so nested arrays under objects are found.
      visit(node[0], `${path}[0]`, depth + 1);

      return;
    }

    for (const [key, child] of Object.entries(node)) {
      visit(child, `${path}${quoteKeyIfNeeded(key)}`, depth + 1);
    }
  };

  visit(value, '$', 0);

  const ranked = [...candidates].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return right.length - left.length;
  });

  const suggestions: string[] = [];

  for (const candidate of ranked) {
    if (suggestions.length >= maxSuggestions) {
      break;
    }

    const end = Math.min(sliceEnd, candidate.length);
    const slicedPath =
      end >= candidate.length
        ? `${candidate.path}[0:${candidate.length}]`
        : `${candidate.path}[0:${end}]`;

    if (!suggestions.includes(slicedPath)) {
      suggestions.push(slicedPath);
    }

    // Also offer the first element when the array is larger than one item —
    // useful for reading a full nested record without maxDepth collapsing.
    if (
      candidate.length > 1 &&
      suggestions.length < maxSuggestions &&
      !suggestions.includes(`${candidate.path}[0]`)
    ) {
      suggestions.push(`${candidate.path}[0]`);
    }
  }

  return suggestions;
};

export const buildSpillNavigationHint = ({
  sizeBytesLabel,
  suggestedPaths,
}: {
  sizeBytesLabel: string;
  suggestedPaths: string[];
}): string => {
  const base = `Output too large to inline (${sizeBytesLabel}). "preview" is a truncated sample (first items, all keys). To read the full data, call learn_tools with extract_json_paths (for json objects) or search_output (for text), then invoke it through execute_tool with this fileId; or use code_interpreter for analysis. These are registry tools, not directly callable.`;

  if (suggestedPaths.length === 0) {
    return base;
  }

  return `${base} Start with extract_json_paths using paths ${JSON.stringify(
    suggestedPaths,
  )} and maxDepth 8 (raise maxDepth if nested fields still show as "object"/"array[N]"). Paths are relative to the spilled file root.`;
};
