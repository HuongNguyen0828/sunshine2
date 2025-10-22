// Controller functions for handling teacher-related requests
// All handlers call service-layer functions and shape HTTP responses.

import { Request, Response } from "express";
import * as ParentService from "../../services/web-admin/parentService"
import { daycareLocationIds } from "../../services/authService";


// POST /api/parents
// Create a new parent
export const addParent = async (req: Request, res: Response) => { 
  // Extract loationId and the parent data from req.user and req.body
  const locationId = req.user?.locationId;
  const daycareId = req.user?.daycareId;

  if (!daycareId) {
    return res.status(400).json({message: "Daycare missing from current Admin  profile"});
  }

  // Check locationId exists
  if (!locationId) {
    return res.status(400).json({message: "Location missing from current Admin  profile"});
  }
  // Check body exists
  const parentDataAndChildId = req.body;
  if (!parentDataAndChildId) {
    return res.status(400).json({ message: "Bakend: Parent data and ChildId required" });
  }

  // Else, create the teacher
  try {
    const created = await ParentService.addParent(parentDataAndChildId);
    // Case null returned: email already exists
    if (!created) {
      throw new Error("Email already exists");
    }
    // else, return created teacher
    return res.status(201).json(created);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error creating Parent" });
  }
};

// GET /api/parents
// List all parents
export const getAllParents = async (req: Request, res: Response) => {
  // Extract locationId and daycareId from req.user (set by authMiddleware)
  const locationId = req.user?.locationId;
  const daycareId = req.user?.daycareId;
  if (!daycareId) {
    return res.status(400).json({message: "Daycare missing from user profile"});
  }
  if (!locationId) {
    return res.status(400).json({message: "Location missing from user profile"});
  }

  // Else, get all teachers only of that daycare and location
  try {
    const parents = await ParentService.getAllParents(daycareId, locationId);
    return res.status(200).json(parents);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to fetch Parents" });
  }
};

// GET /api/parents/:id
// Get a single parent by ID
export const getParentById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "Parent id required" });

    const parent = await ParentService.getParentById(id);
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    return res.json(parent);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error fetching parent" });
  }
};

// PUT /api/parents/:id
// Update an existing parent
export const updateParent = async (req: Request, res: Response) => {

  // Extract locationId from req.user (set by authMiddleware)
  const locationId = req.user?.locationId;
  if (!locationId) {
    return res.status(400).json({message: "Location missing from current Admin profile"});
  }
  
  const daycareId = req.user?.daycareId;

  if (!daycareId) {
    return res.status(400).json({message: "Daycare missing from current Admin  profile"});
  }
  // Get the list of location Id: 
  const locationIds = await daycareLocationIds(daycareId);


  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "Parent id required" });

    // Fetch the parent first
    const parent = await ParentService.getParentById(id);
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    // if (!parent.locationId) {
    //   return res.status(403).json({ message: "Parent data is missing location" });
    // }
    // Check if parent belongs to admin's location list
    // if (!locationIds.includes(parent.locationId)) {
    //   return res.status(403).json({ message: "Forbidden: cannot edit parent from another location" });
    // }

    const updated = await ParentService.updateParent(id, req.body);
    if (!updated) return res.status(404).json({ message: "Failed to update parent" });

    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error updating parent" });
  }
};

// DELETE /api/parents/:id
// Delete a parent by ID
export const deleteParent = async (req: Request, res: Response) => {
  // Extract locationId from req.user (set by authMiddleware)
  const locationId = req.user?.locationId;
  if (!locationId) {
    return res.status(400).json({message: "Location missing from current Admin profile"});
  }

  try {
    // Extract id from URL params
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "Parent id required" });

    // Fetch the teacher first
    console.log("locationId", locationId);
    console.log("backend:" , id)
    const parent = await ParentService.getParentById(id);
    console.log (parent);
    if (parent == null) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // Check if teacher belongs to admin's location
    // if (parent.locationId !== locationId) {
    //   return res.status(403).json({ message: "Forbidden: cannot delete parent from another location" });
    // }

    const ok = await ParentService.deleteParent
    if (!ok) return res.status(404).json({ message: "Failed to delete parent" });

    return res.json({ ok: true, uid: id });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error deleting parent" });
  }
};

// POST /api/parents/:id/assign
// Assign a parent to a child (bidirectional update) 
export const assignParentToChild = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { childId } = req.body || {};

    if (!id) return res.status(400).json({ message: "Parent id required" });
    if (!childId) return res.status(400).json({ message: "childId required" });

    const ok = await ParentService.assignParentToChild(id, childId);
    if (!ok) return res.status(404).json({ message: "Parent or child not found" });

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error assigning Parent to Child" });
  }
};
