// src/services/kidsService.ts
import type { Child } from "../../../../shared/types/type";

let childs: Child[] = []; // temporary in-memory storage

export const getAllChilds = async (): Promise<Child[]> => {
  return childs;
};

export const addChild = async (child: Child): Promise<Child> => {
  childs.push(child);
  return child;
};

export const getChildById = async (id: string): Promise<Child | undefined> => {
  return childs.find((k) => k.id === id);
};

export const deleteChild = async (id: string): Promise<boolean> => {
  const index = childs.findIndex((k) => k.id === id);
  if (index > -1) {
    childs.splice(index, 1);
    return true;
  }
  return false;
};


export const updateChild = async (
  id: string,
  body: Partial<Child> // accept only fields that need updating
): Promise<Child | undefined> => {
  let updatedChild: Child | undefined;

  childs = childs.map((k) => {
    if (k.id === id) {
      updatedChild = { ...k, ...body }; // merge old and new
      return updatedChild;
    }
    return k;
  });

  return updatedChild;
};