// Controller functions for handling Kid-related requests
import { Request, Response } from 'express';
import * as kidsService from '../services/kidsService';



// Get all kids
export const getAllKids = async (req: Request, res: Response) => {
  try {
    const kids = await kidsService.getAllKids();
    res.json(kids);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching kids' });
  }
};

// Get a single kid by ID
export const getKidById = async (req: Request, res: Response) => {
  try {
    const kid = await kidsService.getKidById(req.params.id);
    if (!kid) return res.status(404).json({ message: 'Kid not found' });
    res.json(kid);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching kid' });
  }
};

// Create a new kid
export const createKid = async (req: Request, res: Response) => {
  try {
    const newKid = await kidsService.createKid(req.body);
    res.status(201).json(newKid);
  } catch (error) {
    res.status(500).json({ message: 'Error creating kid' });
  }
};

// Update an existing kid
export const updateKid = async (req: Request, res: Response) => {
  try {
    const updatedKid = await kidsService.updateKid(req.params.id, req.body);
    if (!updatedKid) return res.status(404).json({ message: 'Kid not found' });
    res.json(updatedKid);
  } catch (error) {
    res.status(500).json({ message: 'Error updating kid' });
  }
};


// Delete a kid
export const deleteKid = async (req: Request, res: Response) => {
  try {
    const success = await kidsService.deleteKid(req.params.id);
    if (!success) return res.status(404).json({ message: 'Kid not found' });
    res.json({ message: 'Kid deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting kid' });
  }
};
