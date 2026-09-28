import {
  buildSpillNavigationHint,
  suggestExtractJsonPaths,
} from 'src/engine/core-modules/tool/utils/suggest-extract-json-paths.util';

describe('suggestExtractJsonPaths', () => {
  it('suggests sliced paths under ToolOutput.result for message lists', () => {
    const output = {
      success: true,
      message: 'Executed GMAIL_FETCH_EMAILS',
      result: {
        data: {
          messages: Array.from({ length: 6 }, (_, index) => ({
            messageId: `id-${index}`,
            subject: `Subject ${index}`,
          })),
          resultSizeEstimate: 6,
        },
        logId: 'log_abc',
      },
    };

    expect(suggestExtractJsonPaths(output)).toEqual([
      '$.result.data.messages[0:5]',
      '$.result.data.messages[0]',
    ]);
  });

  it('prefers result arrays over sibling arrays', () => {
    const output = {
      success: true,
      message: 'ok',
      warnings: ['a', 'b', 'c'],
      result: {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      },
    };

    expect(suggestExtractJsonPaths(output)[0]).toBe('$.result.items[0:4]');
  });

  it('quotes non-identifier keys', () => {
    const output = {
      result: {
        'failed-step': [{ id: 1 }, { id: 2 }],
      },
    };

    expect(suggestExtractJsonPaths(output)[0]).toBe(
      '$.result["failed-step"][0:2]',
    );
  });

  it('returns an empty list for scalars', () => {
    expect(suggestExtractJsonPaths('hello')).toEqual([]);
    expect(suggestExtractJsonPaths(null)).toEqual([]);
  });
});

describe('buildSpillNavigationHint', () => {
  it('appends concrete paths and maxDepth guidance', () => {
    const hint = buildSpillNavigationHint({
      sizeBytesLabel: '30.5 kB',
      suggestedPaths: ['$.result.data.messages[0:5]'],
    });

    expect(hint).toContain('30.5 kB');
    expect(hint).toContain('$.result.data.messages[0:5]');
    expect(hint).toContain('maxDepth 8');
    expect(hint).toContain('spilled file root');
  });

  it('falls back to the base hint when no paths are available', () => {
    const hint = buildSpillNavigationHint({
      sizeBytesLabel: '20 kB',
      suggestedPaths: [],
    });

    expect(hint).toContain('20 kB');
    expect(hint).not.toContain('Start with extract_json_paths');
  });
});
