import { Request, Response } from "express"
import {signUp} from "../services/authService"

export async function SignUpController(req: Request, res: Response) {
    const {email, password, name } = req.body;

    try {
        // Extract role from service
        const result = await signUp(email, name, password);
        return res.status(201).json({ message: `${result.role} registered successfully` });
    } catch (error: any) {
        // Case cannot found any match of user record
        if (error.message.includes("not recognized")) {
        return res.status(400).json({ message: error.message });
        }
        console.error(error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
}