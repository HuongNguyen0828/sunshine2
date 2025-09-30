
// src/routes/kidsRoutes.ts
import { Router } from "express";
import { getAllChilds, addChild, getChildById, updateChild, deleteChild } from "../../controllers/web-admin/ChildController";


const childRoutes = Router();


// POST /childs
childRoutes.post("/", addChild);


// GET /childs
childRoutes.get("/", getAllChilds);

// GET /childs/:id
childRoutes.get("/:id", getChildById);

// Update child
childRoutes.put("/:id", updateChild);

// DELETE /childs/:id
childRoutes.delete("/:id", deleteChild);


export default childRoutes;