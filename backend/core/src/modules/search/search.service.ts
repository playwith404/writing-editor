import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly client: Client;

  private readonly indices = {
    documents: 'documents',
    characters: 'characters',
    worldSettings: 'world_settings',
    plots: 'plots',
    projects: 'projects',
  } as const;

  constructor(configService: ConfigService) {
    this.client = new Client({
      node: configService.get<string>('elastic.node'),
      auth: configService.get<string>('elastic.apiKey')
        ? { apiKey: configService.get<string>('elastic.apiKey')! }
        : undefined,
    });
  }

  async onModuleInit() {
    try {
      await this.ensureIndices();
    } catch (error) {
      this.logger.warn('Failed to ensure search indices');
    }
  }

  async ensureIndices() {
    for (const index of Object.values(this.indices)) {
      const exists = await this.client.indices.exists({ index });
      if (!exists) {
        await this.client.indices.create({ index });
      }
    }
  }

  async indexDocument(index: string, id: string, body: Record<string, unknown>) {
    try {
      await this.client.index({
        index,
        id,
        document: body,
        refresh: 'wait_for',
      });
    } catch (error) {
      this.logger.warn(`Indexing failed for ${index}:${id}`);
    }
  }

  async search(query: string, options?: { projectId?: string; type?: string }) {
    const indices = options?.type ? [options.type] : Object.values(this.indices);
    const filters = [] as any[];
    if (options?.projectId) {
      filters.push({ term: { projectId: options.projectId } });
    }

    const { hits } = await this.client.search({
      index: indices,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['title^3', 'name^2', 'content', 'description', 'genre'],
                fuzziness: 'AUTO',
              },
            },
          ],
          filter: filters,
        },
      },
    });

    return hits.hits.map((hit) => ({
      id: hit._id,
      index: hit._index,
      score: hit._score,
      source: hit._source,
    }));
  }
}
