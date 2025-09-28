// src/routes/web-admin/ChildRoutes.ts
import { Router } from "express";
import { getAllChilds, addChild, getChildById, updateChild, deleteChild } from "../../controllers/web-admin/ChildController";

const childRoutes = Router();

childRoutes.post("/", addChild);         // POST   /child
childRoutes.get("/", getAllChilds);      // GET    /child
childRoutes.get("/:id", getChildById);   // GET    /child/:id
childRoutes.put("/:id", updateChild);    // PUT    /child/:id
childRoutes.delete("/:id", deleteChild); // DELETE /child/:id

export default childRoutes;
