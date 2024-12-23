import express from "express";
import { allUsers,allChats, allMessages, getDashboardStats, adminLogin, adminLogOut, verifyAdmin } from "../controllers/admin.js";
import { adminLoginValidator, validateHandler } from "../lib/validators.js";
import { adminOnly } from "../middlewares/auth.js";

const app = express.Router();


app.post("/verify",adminLoginValidator(),validateHandler,adminLogin)
app.get("/logout",adminLogOut)
app.get("/stats",getDashboardStats)
app.get("/users",allUsers)
app.get("/chats",allChats)
app.get("/messages",allMessages)
app.use(adminOnly);

app.get("/",verifyAdmin)











export default app;