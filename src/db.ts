import Dexie, { type Table } from 'dexie';
import type { ThoughtNode, Settings, ThoughtEdge, Garden } from './types';

class MindGardenDB extends Dexie {
  nodes!: Table<ThoughtNode, string>;
  settings!: Table<Settings, string>;
  edges!: Table<ThoughtEdge, string>;
  gardens!: Table<Garden, string>;

  constructor() {
    super('mind-garden');
    this.version(5).stores({
      nodes: 'id, gardenId, createdAt, type, status',
      settings: 'id',
      edges: 'id, gardenId, source, target',
      gardens: 'id, createdAt',
    }).upgrade(async tx => {
      // Добавляем профиль по умолчанию для старых садов
      await tx.table('gardens').toCollection().modify(garden => {
        if (!garden.profile) garden.profile = 'psychology';
      });
    });
  }
}

export const db = new MindGardenDB();