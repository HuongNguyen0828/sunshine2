// web-admin/hooks/useLocationsAPI.ts
"use client";

import { ENDPOINTS } from "@shared/api/endpoint";
import api from "@shared/api/client";

export type LocationLite = {
  id: string;
  name?: string;
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
