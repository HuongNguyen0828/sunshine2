// Controller functions for handling child-related requests
import { Request, Response } from 'express';
import * as ChildsService from "../../services/childsService";


// Create a new child
export const addChild = async (req: Request, res: Response) => {
  try {
    const newchild = await ChildsService.addChild(req.body);
    res.status(201).json(newchild);
  } catch (error) {
    res.status(500).json({ message: 'Error creating child' });
  }
};

// Get all childs
export const getAllChilds = async (req: Request, res: Response) => {
  try {
    const childs = await ChildsService.getAllChilds();
    res.json(childs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching childs' });
  }
};

// Get a single child by ID
export const getChildById = async (req: Request, res: Response) => {
  try {
    // if id not found return undefined
    const child = await ChildsService.getChildById?(req.params.id) : undefined; 
    if (!child) return res.status(404).json({ message: 'child not found' });
    // if found return the child
    res.json(child);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching child' });
  }
};



// Update an existing child
export const updateChild = async (req: Request, res: Response) => {
  try {
    const updatedchild = await ChildsService.updateChild?(req.params.id, req.body) : undefined;
    if (!updatedchild) return res.status(404).json({ message: 'child not found' });
    res.json(updatedchild);
  } catch (error) {
    res.status(500).json({ message: 'Error updating child' });
  }
};


// Delete a child
export const deleteChild = async (req: Request, res: Response) => {
  try {
    const success = await ChildsService.deleteChild?(req.params.id) : false;
    if (!success) return res.status(404).json({ message: 'child not found' });
    res.json({ message: 'child deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting child' });
  }
};
