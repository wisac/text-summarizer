import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

type ModelConfigFile = {
   modelName: string;
};

const DEFAULT_MODEL_NAME = 'gemini-flash-lite-latest';

@Injectable()
export class ModelConfigService {
   private readonly configPath = join(process.cwd(), 'model.json');

   async getActiveModelName(): Promise<string> {
      const config = await this.readConfig();
      return this.normalizeModelName(config.modelName);
   }

   async updateActiveModelName(modelName: string): Promise<string> {
      const normalizedModelName = this.normalizeModelName(modelName);
      if (!normalizedModelName) {
         throw new BadRequestException('modelName is required');
      }

      await this.writeConfig({ modelName: normalizedModelName });
      return normalizedModelName;
   }

   private async readConfig(): Promise<ModelConfigFile> {
      try {
         const raw = await fs.readFile(this.configPath, 'utf-8');
         const parsed = JSON.parse(raw) as Partial<ModelConfigFile>;

         if (!parsed.modelName || !parsed.modelName.trim()) {
            throw new Error('Missing modelName in model config file');
         }

         return { modelName: this.normalizeModelName(parsed.modelName) };
      } catch (error) {
         const isMissingFile =
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT';

         if (isMissingFile) {
            const defaultConfig: ModelConfigFile = {
               modelName: DEFAULT_MODEL_NAME,
            };
            await this.writeConfig(defaultConfig);
            return defaultConfig;
         }

         throw error;
      }
   }

   private async writeConfig(config: ModelConfigFile): Promise<void> {
      const content = `${JSON.stringify(config, null, 2)}\n`;
      await fs.writeFile(this.configPath, content, 'utf-8');
   }

   private normalizeModelName(modelName: string | undefined): string {
      const trimmed = modelName?.trim() ?? '';
      if (!trimmed) {
         return '';
      }

      const parts = trimmed.split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : trimmed;
   }
}
