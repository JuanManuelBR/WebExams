import { UserController } from "@src/controllers/UserController";
import { Router } from "express";

const router = Router();

router.get("/", UserController.getUsers);

router.get("/:id", UserController.getUserById);

router.post("/", UserController.AddUser);

router.delete("/:id", UserController.deleteUser);

router.put("/:id", UserController.editUser);

export default router;
