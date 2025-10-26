"use client";

import * as Types from "../../shared/types/type";
import { NewChildInput, NewParentInput } from "@/types/forms";
import api from "@/api/client";
import { ENDPOINTS } from "@/api/endpoint";
import swal from "sweetalert2";


export async function fetchChildren(): Promise<Types.Child[]> {
  try {
    const children = await api.get<Types.Child[]>(ENDPOINTS.children);
    return children;
  } catch (err: unknown) {
    console.error(err);
    throw err;
  }
}

// Type of combination child and parent1 and parent 2
export type  returnChildWithParents = {child: Types.Child} & {parent1: Types.Parent} & {parent2: Types.Parent | null};

// Passing Parent Input with ChildId
export type NewChildWithParentsInput = { child: NewChildInput } & {
  parent1: NewParentInput;
} & { parent2: NewParentInput | null };

export async function addChildWithParents(
  NewChildAndParents: NewChildWithParentsInput
): Promise<returnChildWithParents> {
  try {
    const childAndParents = await api.post<returnChildWithParents>(ENDPOINTS.children, {
      ...NewChildAndParents,
    }); // with createdChildId
    swal.fire({
      icon: "success",
      title: "New Parent",
      text: `Successfully added ${NewChildAndParents.child.firstName} ${NewChildAndParents.child.lastName} \n Parent1:${NewChildAndParents.parent1.firstName}  \n Parent2: ${NewChildAndParents.parent2 ? NewChildAndParents.parent2.firstName : "none"}`,
    });

    return childAndParents;
  } catch (err: unknown) {
    // console.error(err);
    swal.fire({
      title: "Error",
      text: err instanceof Error ? err.message : "Unknown error",
      icon: "error",
    });
    throw err; // Rethrow the error to be handled by the caller
  }
}

export async function updateChild(
  id: string,
  payload: NewParentInput
): Promise<Types.Child> {
  try {
    console.log(id);
    const parent = await api.put<Types.Child>(`${ENDPOINTS.children}/${id}`, {
      ...payload,
    });
    return parent;
  } catch (err: unknown) {
    console.error(err);
    // return null;
    throw err; // Rethrow the error to be handled by the caller
  }
}

export async function deleteChild(
  id: string
): Promise<{ ok: boolean; uid: string }> {
  try {
    const res = await api.delete<{ ok: boolean; uid: string }>(
      `${ENDPOINTS.children}/${id}`
    );
    return res;
  } catch (err: unknown) {
    console.error(err);
    throw err; // Rethrow the error to be handled by the caller
  }
}

export async function assignChildToClass(
  id: string,
  childId: string
): Promise<{ ok: boolean } | null> {
  try {
    const res = await api.post<{ ok: boolean }>(
      `${ENDPOINTS.children}/${id}/assign`,
      { childId }
    );
    return res;
  } catch (err: unknown) {
    console.error(err);
    throw err; // Rethrow the error to be handled by the caller
  }
}
