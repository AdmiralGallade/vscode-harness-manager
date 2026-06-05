import { MetadataParser } from '../services/MetadataParser';
import { HarnessesList, HarnessDefinition } from '../types/harness';

describe('MetadataParser', () => {
  let parser: MetadataParser;

  beforeEach(() => {
    parser = new MetadataParser();
  });

  describe('parseHarnesesList', () => {
    it('should parse valid harnesses list', () => {
      const mockList: HarnessesList = {
        version: '1.0',
        lastUpdated: '2026-05-28T00:00:00Z',
        harnesses: [
          {
            id: 'test-harness',
            name: 'Test Harness',
            description: 'A test harness',
            category: 'test',
            tags: ['test'],
            dependencies: [],
            author: 'Test',
            version: '1.0.0',
            files: [],
          },
        ],
      };

      const result = parser.parseHarnesesList(mockList);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-harness');
    });

    it('should throw error on invalid data', () => {
      expect(() => parser.parseHarnesesList(null as any)).toThrow();
      expect(() => parser.parseHarnesesList({ harnesses: null } as any)).toThrow();
    });
  });

  describe('findHarnessById', () => {
    it('should find harness by id', () => {
      const harnesses: HarnessDefinition[] = [
        {
          id: 'harness-1',
          name: 'Harness 1',
          description: 'Description 1',
          category: 'cat1',
          tags: ['tag1'],
          dependencies: [],
          author: 'Author',
          version: '1.0.0',
          files: [],
        },
      ];

      const result = parser.findHarnessById(harnesses, 'harness-1');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Harness 1');
    });

    it('should return null when harness not found', () => {
      const harnesses: HarnessDefinition[] = [];
      const result = parser.findHarnessById(harnesses, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('filterByTag', () => {
    it('should filter harnesses by tag', () => {
      const harnesses: HarnessDefinition[] = [
        {
          id: 'h1',
          name: 'Harness 1',
          description: 'Desc',
          category: 'cat',
          tags: ['data', 'processing'],
          dependencies: [],
          author: 'Author',
          version: '1.0.0',
          files: [],
        },
        {
          id: 'h2',
          name: 'Harness 2',
          description: 'Desc',
          category: 'cat',
          tags: ['migration'],
          dependencies: [],
          author: 'Author',
          version: '1.0.0',
          files: [],
        },
      ];

      const result = parser.filterByTag(harnesses, 'data');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('h1');
    });
  });

  describe('search', () => {
    it('should search harnesses by name', () => {
      const harnesses: HarnessDefinition[] = [
        {
          id: 'h1',
          name: 'Data Processing Harness',
          description: 'Process data',
          category: 'data',
          tags: ['data'],
          dependencies: [],
          author: 'Author',
          version: '1.0.0',
          files: [],
        },
      ];

      const result = parser.search(harnesses, 'data');
      expect(result).toHaveLength(1);
    });

    it('should search harnesses by description', () => {
      const harnesses: HarnessDefinition[] = [
        {
          id: 'h1',
          name: 'Harness',
          description: 'Migration tool',
          category: 'cat',
          tags: [],
          dependencies: [],
          author: 'Author',
          version: '1.0.0',
          files: [],
        },
      ];

      const result = parser.search(harnesses, 'migration');
      expect(result).toHaveLength(1);
    });

    it('should be case insensitive', () => {
      const harnesses: HarnessDefinition[] = [
        {
          id: 'h1',
          name: 'DATA Harness',
          description: 'Desc',
          category: 'cat',
          tags: [],
          dependencies: [],
          author: 'Author',
          version: '1.0.0',
          files: [],
        },
      ];

      const result = parser.search(harnesses, 'data');
      expect(result).toHaveLength(1);
    });
  });

  describe('getUniqueTags', () => {
    it('should extract and sort unique tags', () => {
      const harnesses: HarnessDefinition[] = [
        {
          id: 'h1',
          name: 'H1',
          description: 'Desc',
          category: 'cat',
          tags: ['tag2', 'tag1'],
          dependencies: [],
          author: 'Author',
          version: '1.0.0',
          files: [],
        },
        {
          id: 'h2',
          name: 'H2',
          description: 'Desc',
          category: 'cat',
          tags: ['tag1', 'tag3'],
          dependencies: [],
          author: 'Author',
          version: '1.0.0',
          files: [],
        },
      ];

      const result = parser.getUniqueTags(harnesses);
      expect(result).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('parseYaml', () => {
    it('should parse valid YAML', () => {
      const yaml = `
name: test
version: 1.0
items:
  - item1
  - item2
`;
      const result = parser.parseYaml(yaml);
      expect(result.name).toBe('test');
      expect(result.version).toBe(1.0);
      expect(result.items).toHaveLength(2);
    });

    it('should throw on invalid YAML', () => {
      const invalidYaml = ': invalid: yaml: syntax:';
      expect(() => parser.parseYaml(invalidYaml)).toThrow();
    });
  });

  describe('parseJson', () => {
    it('should parse valid JSON', () => {
      const json = '{"name": "test", "version": 1.0}';
      const result = parser.parseJson(json);
      expect(result.name).toBe('test');
      expect(result.version).toBe(1.0);
    });

    it('should throw on invalid JSON', () => {
      const invalidJson = '{invalid json}';
      expect(() => parser.parseJson(invalidJson)).toThrow();
    });
  });
});
