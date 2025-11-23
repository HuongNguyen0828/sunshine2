// web-admin/services/useLocationsAPI.ts
"use client";

import { ENDPOINTS } from "@/api/endpoint";
import api from "@/api/client";

export type LocationLite = {
  id: string;
  name?: string;
  capacity?: number;
};

export async function fetchLocationsLite(): Promise<LocationLite[] | null> {
  try {
    const data = await api.get<LocationLite[]>(ENDPOINTS.locations);
    return data;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}
