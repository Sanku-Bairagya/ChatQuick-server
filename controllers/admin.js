import { TryCatch } from "../middlewares/error.js";
import { User } from "../models/user.js";
import {Chat} from "../models/chat.js"
import { Message } from "../models/message.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";
import {cookieOption} from "../utils/features.js"
import { adminSecretKey } from "../app.js";


const adminLogin = TryCatch(async(req,res,next) => {
    const {secretKey} = req.body;
    
    const isMatch = secretKey === adminSecretKey;

    console.log("Is match ?",isMatch)
    if(!isMatch) return next(new ErrorHandler("Invalid admin key",401))

    const token = jwt.sign(secretKey,process.env.JWT_SECRET);

    return res.status(200).cookie("chatQuick-admin-token",token,{
      ...cookieOption,maxAge:1000*60*40
    })
    .json({
        success:true,
        message:"Authenticated successfully, Welcome !!"
    })

})

const verifyAdmin = TryCatch(async(req,res) =>{
    return res.status(200).json({
        admin:true
    })
})



const adminLogOut = TryCatch(async(req,res,next) => {
   

    return res.status(200)
    .cookie("chatQuick-admin-token","",{
      ...cookieOption,maxAge:0
    })
    .json({
        success:true,
        message:"Logged out successfully !!"
    })

})

const allUsers = TryCatch(async(req,res)=>{

    const users = await User.find({});

    const transformedUsers = await Promise.all(users.map(async ({name,username,avatar,_id}) => {
        const [groups,friends] = await Promise.all([
            Chat.countDocuments({groupchat:true,members:_id}),
            Chat.countDocuments({groupchat:false,members:_id}),
        ]);

        return {
            name,
            username,
            avatar:avatar.url,
            _id,
            groups,
            friends
        }

    }))


    return res.status(200).json({
        status:"success",
        users:transformedUsers,
    })

})

const allChats = TryCatch(async(req,res)=>{

    const chats = await Chat.find({})
    . populate("members","name avatar")
    .populate("creator","name avatar")

    const transformedChats = await Promise.all(chats.map(async({members,_id,groupchat,name,creator})=>{

        const totalMessages = await Message.countDocuments({chat:_id});

        return {
            _id,
            groupchat,
            name,
            avatar:members.slice(0,3).map((member)=>member.avatar.url),
            members:members.map(({_id,name,avatar}) => ({
                _id,
                name,
                avatar:avatar.url
                
            })),
            creator:{
                name:creator?.name || " None",
                avatar:creator?.avatar.url || ""
            },
            totalMembers:members.length,
            totalMessages
        }
    }))

    return res.status(200).json({
        status:"success",
        chats:transformedChats
    })
})

const allMessages = TryCatch(async(req,res) => {
    const messages = await  Message.find({})
    .populate("sender","name avatar")
    .populate("chat","groupchat")


    const transformedMessages = messages.map(({content,attachments,_id,sender,createdAt,chat}) =>( {
       
        
         _id,
        attachments,
        content,
        createdAt,
        chat:chat?._id ,
        groupchat:chat?.groupchat ,
        sender:{
            _id:sender?._id ,
            name:sender?._name ,
            avatar:sender?.avatar.url 
        }

    })
)

    res.status(200).json({
        status:"success",
        messages:transformedMessages
    })
})

const getDashboardStats = TryCatch(async(req,res) => {

    const [groupsCount,usersCount,messagesCount,totalChatsCount] = await Promise.all([
        Chat.countDocuments({groupchat:true}),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
    ])

   
    const today = new Date();

    const last7days = new Date();

    last7days.setDate(last7days.getDate() - 7);

    const last7DaysMessages = await Message.find({
        createdAt:{
            $gte:last7days,
            $lte:today
        }
    }).select("createdAt")

    const messages = new Array(7).fill(0);

    const dayinMiliseconds = 1000*60*60*24

    last7DaysMessages.forEach((message) => {  
        const indexApprox = (today.getTime()-message.createdAt.getTime())/dayinMiliseconds;

        const index = Math.floor(indexApprox);
        messages[6-index] ++;
    })
    
    const stats = {
        groupsCount,
        usersCount,
        messagesCount,
        totalChatsCount,
        messageChart:messages
    }



    return res.status(200).json({
        status:"success",
        stats,
        
    })
})

export {allUsers,allChats,allMessages,getDashboardStats,adminLogin,adminLogOut,verifyAdmin}