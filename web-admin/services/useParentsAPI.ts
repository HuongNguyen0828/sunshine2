"use client";

import * as Types from "../../shared/types/type"
import { NewParentInput } from "@/types/forms";
import api from "@/api/client";
import { ENDPOINTS } from "@/api/endpoint";
import swal from "sweetalert2";

export async function fetchParents(): Promise<Types.Parent[]> {
  try {
    const parents = await api.get<Types.Parent[]>(ENDPOINTS.parents);
    return parents;
  } catch (err: unknown) {
    console.error(err);
    throw err;
  }
}

// Passing Parent Input with ChildId
export type NewParentInputWithChildId = NewParentInput & {childIds: string[]};
export async function addParent(NewParentInputWithChildId: NewParentInputWithChildId): Promise<Types.Parent> {
  try {
    alert("Adding Parent");
    const parent = await api.post<Types.Parent>(ENDPOINTS.parents, { ...NewParentInputWithChildId }); // with createdChildId
    swal.fire({
          icon: "success",
          title: "New Parent",
          text: `Successfully added ${NewParentInputWithChildId.firstName} ${NewParentInputWithChildId.lastName}`,
        });
    return parent;
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

export async function updateParent(
  id: string,
  payload: NewParentInput
): Promise<Types.Parent> {
  try {
      console.log(id);
    const parent = await api.put<Types.Parent>(`${ENDPOINTS.parents}/${id}`, { ...payload });
    return parent;
  } catch (err: unknown) {
    console.error(err);
    // return null;
    throw err; // Rethrow the error to be handled by the caller
  }
}

export async function deleteParent(
  id: string
): Promise<{ ok: boolean; uid: string }> {
  try {
    const res = await api.delete<{ ok: boolean; uid: string }>(`${ENDPOINTS.parents}/${id}`);
    return res;
  } catch (err: unknown) {
    console.error(err);
    throw err; // Rethrow the error to be handled by the caller
  }
}

export async function assignParentToChild(
  id: string,
  childId: string
): Promise<{ ok: boolean } | null> {
  try {
    const res = await api.post<{ ok: boolean }>(`${ENDPOINTS.parents}/${id}/assign`, { childId });
    return res;
  } catch (err: unknown) {
    console.error(err);
    throw err; // Rethrow the error to be handled by the caller
  }
}
