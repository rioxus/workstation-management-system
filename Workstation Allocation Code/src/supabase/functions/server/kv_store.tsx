// Minimal KV store stub - Not used by Workstation Allotment Tracker
// This application uses direct Supabase client connections instead

export const set = async (key: string, value: any): Promise<void> => {
  // Stub - not implemented
};

export const get = async (key: string): Promise<any> => {
  return null;
};

export const del = async (key: string): Promise<void> => {
  // Stub - not implemented
};

export const mset = async (keys: string[], values: any[]): Promise<void> => {
  // Stub - not implemented
};

export const mget = async (keys: string[]): Promise<any[]> => {
  return [];
};

export const mdel = async (keys: string[]): Promise<void> => {
  // Stub - not implemented
};

export const getByPrefix = async (prefix: string): Promise<any[]> => {
  return [];
};