export interface Categoria {
  id: number;
  name: string;
  slug?: string;
  parent_id?: number | null;
  sort_order?: number;
  children?: Categoria[];
}
