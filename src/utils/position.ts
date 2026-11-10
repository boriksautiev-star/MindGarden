import type { ThoughtNode, ThoughtEdge } from '../types';

export function calculateChildPosition(
  parent: ThoughtNode | undefined,
  edges: ThoughtEdge[],
  parentId?: string
): { x: number; y: number } {
  // Если родителя нет, ставим в случайное место
  if (!parent) {
    return { x: Math.random() * 200, y: Math.random() * 200 };
  }
  
  // Если передан ID родителя, но мы не можем найти связи (или их 0), ставим просто снизу
  if (!parentId) {
    return { x: parent.x + (Math.random() * 100 - 50), y: parent.y + 180 };
  }

  // Считаем, сколько уже есть "детей" у этого родителя
  const siblingsCount = edges.filter(e => e.source === parentId).length;
  
  // Раскладываем в сетку (2 колонки)
  const col = siblingsCount % 2;
  const row = Math.floor(siblingsCount / 2);
  
  return { 
    x: parent.x + 50 + (col * 220), // Сдвиг вправо на 220px для второй колонки
    y: parent.y + 150 + (row * 130) // Сдвиг вниз на 130px для каждого нового ряда
  };
}