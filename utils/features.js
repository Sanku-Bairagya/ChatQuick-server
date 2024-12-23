import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import dotenv from "dotenv";
import {v4 as uuid} from "uuid"
import {v2 as cloudinary} from "cloudinary" 
import { getBase64, getSockets } from "../lib/helper.js";

dotenv.config({
    path:"./.env"
})

const cookieOption = {
    maxAge:90*24*60*60*1000, // 90days
    sameSite:"none",
    httpOnly:true,
    secure:true
}

// database connection function
const connectDB = async (uri) => {
    try {
      const data = await mongoose.connect(uri, { dbName: "ChatQuick" });
      console.log(`Connected to DB: ${data.connection.host}`);
    } catch (err) {
      console.error(`Error connecting to DB: ${err.message}`);
      throw err;
    }
  }

//token cretion function

const sendToken = (res,user,code,message) => {

    const token = jwt.sign({_id:user._id},process.env.JWT_SECRET);

    return res
        .status(code)
        .cookie("chatQuick",token,cookieOption)
        .json({
            success:true,
            user,
            message
        });

}

const emitEvent = (req,event,users,data) => {
    let io = req.app.get("io");

    const userSocket = getSockets(users);

    io.to(userSocket).emit(event,data)
    
    console.log("Emitting event",event);
}

const uploadFilesCloudinary = async(files=[]) => {
    const uploadPromises = files.map((file) => {
        console.log("file is :----> ",file)
        return new Promise((resolve,reject) => {
            cloudinary.uploader.upload(
                getBase64(file),
                {
                    resource_type:"auto",
                    public_id:uuid(),
                },
                (error,result) => {
                    if(error) return reject(error);
                    resolve(result)
                }
            )
        })
    })

    try {
        const results = await Promise.all(uploadPromises);
        const formatedResult = results.map((result) => ({
            public_id:result.public_id,
            url:result.secure_url
        }))

        return formatedResult;
    } catch (error) {
        console.log(error);
        
        throw new Error("Error uploading file to cloudinary",error)
    }
}

const deleteFilesCloudinary = async (public_ids) => {
    
}



export {connectDB,sendToken,cookieOption,emitEvent,deleteFilesCloudinary,uploadFilesCloudinary}