import { TryCatch } from "./error.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken"

import {adminSecretKey} from "../app.js"
import { chatQuick_Token } from "../constants/config.js";
import { User } from "../models/user.js";

const isAuthenticated = TryCatch(async (req,res,next) => {
    
    const token = req.cookies[chatQuick_Token]
   
    if(!token){
        return next(new ErrorHandler("Please login to access this route ",401))
    }
    
    const decodedData = jwt.verify(token,process.env.JWT_SECRET);
    req.user = decodedData._id;

    next();
    
});

const adminOnly = (req,res,next) => {
    
    const token = req.cookies["chatQuick-admin-token"]
    
    if(!token){
        return next(new ErrorHandler("Only admin can access this route",401))
    }
    const secretKey = jwt.verify(token,process.env.JWT_SECRET);

    const isMatch = secretKey === adminSecretKey;

    if(!isMatch) return next(new ErrorHandler("Only admin can access this route",401))

    

    next();
}

const socketAuthenticator = async(err,socket,next)=>{
    try {
        if(err) return next(err);

        const authToken = socket.request.cookies[chatQuick_Token]
        
        if(!authToken) return next(new ErrorHandler("Please login to access this route",401))

        const decodedData = jwt.verify(authToken,process.env.JWT_SECRET);

        const user = await User.findById(decodedData._id);

        if(!user) return next(new ErrorHandler("Please login to access this route",401))

        socket.user = user;

        return next();


    } catch (error) {
        console.log(error);
        
        return next(new ErrorHandler("Please login to access this route",401))
    }
}



export {isAuthenticated,adminOnly,socketAuthenticator}