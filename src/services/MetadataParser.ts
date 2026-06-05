import { HarnessesList, HarnessDefinition } from '../types/harness';
import * as yaml from 'js-yaml';

/**
 * Service for parsing and transforming harness metadata
 */
export class MetadataParser {
  /**
   * Parse harnesses list and return as array of definitions
   */
  parseHarnesesList(data: HarnessesList): HarnessDefinition[] {
    if (!data || !data.harnesses || !Array.isArray(data.harnesses)) {
      throw new Error('Invalid harnesses list format');
    }
    return data.harnesses;
  }

  /**
   * Find a harness by ID
   */
  findHarnessById(harnesses: HarnessDefinition[], id: string): HarnessDefinition | null {
    return harnesses.find((h) => h.id === id) || null;
  }

  /**
   * Filter harnesses by tag
   */
  filterByTag(harnesses: HarnessDefinition[], tag: string): HarnessDefinition[] {
    return harnesses.filter((h) => h.tags.includes(tag));
  }

  /**
   * Search harnesses by name/description
   */
  search(harnesses: HarnessDefinition[], query: string): HarnessDefinition[] {
    const lowerQuery = query.toLowerCase();
    return harnesses.filter(
      (h) =>
        h.name.toLowerCase().includes(lowerQuery) ||
        h.description.toLowerCase().includes(lowerQuery) ||
        h.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get unique tags from all harnesses
   */
  getUniqueTags(harnesses: HarnessDefinition[]): string[] {
    const tags = new Set<string>();
    harnesses.forEach((h) => h.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }

  /**
   * Get unique categories
   */
  getUniqueCategories(harnesses: HarnessDefinition[]): string[] {
    const categories = new Set<string>();
    harnesses.forEach((h) => categories.add(h.category));
    return Array.from(categories).sort();
  }

  /**
   * Parse YAML template
   */
  parseYaml(content: string): any {
    try {
      return yaml.load(content);
    } catch (error) {
      console.error('Error parsing YAML:', error);
      throw error;
    }
  }

  /**
   * Stringify YAML
   */
  stringifyYaml(data: any): string {
    try {
      return yaml.dump(data, { lineWidth: -1 });
    } catch (error) {
      console.error('Error stringifying YAML:', error);
      throw error;
    }
  }

  /**
   * Parse JSON
   */
  parseJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      throw error;
    }
  }

  /**
   * Stringify JSON
   */
  stringifyJson(data: any, pretty: boolean = true): string {
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  /**
   * Get file parser based on extension
   */
  parseFileByExtension(filePath: string, content: string): any {
    const ext = filePath.toLowerCase().split('.').pop();

    switch (ext) {
      case 'yaml':
      case 'yml':
        return this.parseYaml(content);
      case 'json':
        return this.parseJson(content);
      default:
        return content;
    }
  }

  /**
   * Format harness for display in Quick Pick
   */
  formatForQuickPick(harness: HarnessDefinition): {
    label: string;
    description: string;
    detail: string;
  } {
    return {
      label: harness.name,
      description: harness.tags.join(', '),
      detail: harness.description,
    };
  }

  /**
   * Build dependency tree
   */
  buildDependencyTree(
    harnesses: HarnessDefinition[],
    harnessId: string,
    visited: Set<string> = new Set()
  ): HarnessDefinition[] {
    if (visited.has(harnessId)) {
      return [];
    }

    visited.add(harnessId);

    const harness = this.findHarnessById(harnesses, harnessId);
    if (!harness) {
      return [];
    }

    const dependencies = [harness];

    for (const depId of harness.dependencies) {
      dependencies.push(...this.buildDependencyTree(harnesses, depId, visited));
    }

    return dependencies;
  }
}
