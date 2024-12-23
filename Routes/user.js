import express from "express";
import { acceptFrindRequest, getAllNotification, getMyFriends, getMyProfile, login,logOut,newUser, search, sendFrindRequest }  from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { acceptrequestValidator, loginValidator, registerValidator, sendRequestValidator, validateHandler } from "../lib/validators.js";



const app = express.Router();

app.post("/new",singleAvatar, registerValidator() ,validateHandler,newUser);
app.post("/login",loginValidator(),validateHandler,login);


//after here user must be logged in to access the routes

app.use(isAuthenticated)
app.get("/me",getMyProfile)
app.get("/logout",logOut)

app.get("/search",search);

app.put("/sendrequest",sendRequestValidator(),validateHandler,sendFrindRequest)

app.put("/acceptrequest",acceptrequestValidator(),validateHandler,acceptFrindRequest)

app.get("/notification",getAllNotification);

app.get("/friends",getMyFriends);


export default app;