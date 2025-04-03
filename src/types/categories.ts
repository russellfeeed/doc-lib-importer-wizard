
export interface CategoryNode {
  id: string;
  name: string;
  children: CategoryNode[];
  parentId: string | null;
}

export interface CategoryHierarchy {
  categories: CategoryNode[];
}
