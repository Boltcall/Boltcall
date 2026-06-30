export interface AtpTask {
  id: string;
  prompt: string;
  result: string;
}

export const DEFAULT_ATP_TASKS: AtpTask[] = [
  { id: 'task-1', prompt: 'how fast should local service businesses respond to leads', result: '' },
  { id: 'task-2', prompt: 'why local service businesses lose leads after hours', result: '' },
  { id: 'task-3', prompt: 'how to book more inbound leads automatically', result: '' },
];

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function buildDailySeoHandoff(tasks: AtpTask[]) {
  return tasks
    .map((task, index) => `Prompt ${index + 1}: ${task.prompt}\n${task.result || 'No result saved yet.'}`)
    .join('\n\n');
}
