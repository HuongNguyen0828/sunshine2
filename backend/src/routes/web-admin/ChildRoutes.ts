// src/routes/kidsRoutes.ts
import { Router } from "express";
import { getAllChilds, addChild, getChildById, updateChild, deleteChild } from "../../controllers/web-admin/ChildController";


const childRoutes = Router();


// POST /childs
childRoutes.post("/child", addChild);


// GET /childs
childRoutes.get("/child", getAllChilds);

// GET /childs/:id
childRoutes.get("/child/:id", getChildById);

// Update child
childRoutes.put("/child/:id", updateChild);

// DELETE /childs/:id
childRoutes.delete("/child/:id", deleteChild);



export default childRoutes;