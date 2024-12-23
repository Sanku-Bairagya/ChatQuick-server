import express from "express";

import { isAuthenticated } from "../middlewares/auth.js";
import { newGroupChat, getMyChat, getMyGroup, addMembers, removeMembers, leaveGroup, sendAttachment, getChatDetails, renameGroup, deleteChat, getMessages } from "../controllers/chat.js";
import { attachmentMulter } from "../middlewares/multer.js";
import { addMemberValidator, getChatDetailsValidator, getMessagesValidator, leaveGroupValidator, newGroupValidator, removeMemberValidator, renameGroupValidator, sendAttachmentsValidator, validateHandler } from "../lib/validators.js";



const app = express.Router();

//after here user must be logged in to access the routes

app.use(isAuthenticated)

app.post("/new",newGroupValidator(),validateHandler,newGroupChat);
app.get("/my",getMyChat);

app.get("/my/groups",getMyGroup);

app.put("/addmembers",addMemberValidator(),validateHandler,addMembers);

app.put("/removemember",removeMemberValidator(),validateHandler,removeMembers);

app.delete("/leave/:id",leaveGroupValidator(),validateHandler,leaveGroup);

app.post("/message",attachmentMulter,sendAttachmentsValidator(),validateHandler,sendAttachment);

app.get("/message/:id",getMessagesValidator(),validateHandler,getMessages)

app.route("/:id").get(getMessagesValidator(),validateHandler,getChatDetails).put(renameGroupValidator(),validateHandler,renameGroup).delete(getChatDetailsValidator(),validateHandler,deleteChat)

export default app;